import { createHmac } from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

// ── n8n forward ───────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? ''

// Payload plano enviado ao n8n — um evento por mensagem/status, sem aninhamento Meta.
interface N8nPayload {
  event: 'message_received' | 'message_status_update'
  projectId: string
  wabaId: string
  phoneNumberId: string
  // Campos de mensagem recebida
  from: string
  contactName: string
  messageId: string
  messageType: string
  text: string | null
  mediaId: string | null
  mediaType: string | null
  timestamp: string
  // Campos exclusivos de status
  deliveryStatus?: string
  recipientId?: string
}

async function forwardToN8n(payload: N8nPayload, url?: string, token?: string): Promise<void> {
  const n8nUrl = url || N8N_WEBHOOK_URL
  if (!n8nUrl) return
  const secretToken = token || process.env.N8N_WEBHOOK_SECRET_TOKEN
  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secretToken ? { 'X-Webhook-Token': secretToken } : {}),
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      console.error(`[Webhook→n8n] HTTP ${response.status}`)
    }
  } catch (err) {
    console.error('[Webhook→n8n] Erro ao encaminhar:', err)
  }
}

function buildMessagePayload(
  projectId: string,
  wabaId: string,
  phoneNumberId: string,
  value: WebhookValue,
  msg: WebhookMessage,
): N8nPayload {
  const mediaId =
    msg.image?.id ?? msg.audio?.id ?? msg.video?.id ?? msg.document?.id ?? msg.sticker?.id ?? null

  return {
    event: 'message_received',
    projectId,
    wabaId,
    phoneNumberId,
    from: msg.from,
    contactName: value.contacts?.[0]?.profile?.name ?? msg.from,
    messageId: msg.id,
    messageType: msg.type,
    text: msg.text?.body ?? null,
    mediaId,
    mediaType: msg.type !== 'text' ? msg.type : null,
    timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
  }
}

function buildStatusPayload(
  projectId: string,
  wabaId: string,
  phoneNumberId: string,
  status: WebhookStatus,
): N8nPayload {
  return {
    event: 'message_status_update',
    projectId,
    wabaId,
    phoneNumberId,
    from: status.recipient_id,
    contactName: status.recipient_id,
    messageId: status.id,
    messageType: 'status',
    text: null,
    mediaId: null,
    mediaType: null,
    timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
    deliveryStatus: status.status,
    recipientId: status.recipient_id,
  }
}

/* ─── GET: verificação do endpoint pelo Meta ─────────────────────────────── */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

/* ─── Valida token por projeto (chamadas externas com ?id=) ──────────────── */
async function validateProjectToken(projectId: string, token: string | null): Promise<boolean> {
  if (!token || !projectId) return false
  const snap = await getAdminDb().collection('projects').doc(projectId).get()
  if (!snap.exists) return false
  const data = snap.data() as { webhookToken?: string }
  return data?.webhookToken === token
}

/* ─── POST: recebimento de eventos ──────────────────────────────────────── */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  // Chamada direta por projeto (ex.: n8n ou integração externa)
  if (projectId) {
    const token = request.headers.get('x-webhook-token')
    const valid = await validateProjectToken(projectId, token)
    if (!valid) return new Response('Unauthorized', { status: 401 })
    // Aceita e responde OK — extensível para processar payloads externos no futuro
    return new Response('OK', { status: 200 })
  }

  // Evento do Meta (assinatura HMAC)
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  const appSecret = process.env.META_APP_SECRET ?? ''
  if (appSecret) {
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
    if (signature !== expected) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  if (payload.object !== 'whatsapp_business_account') {
    return new Response('OK', { status: 200 })
  }

  await Promise.allSettled(payload.entry.map(processEntry))

  return new Response('OK', { status: 200 })
}

/* ─── Roteamento: identifica o projeto pelo phone_number_id ─────────────── */
async function processEntry(entry: WebhookEntry) {
  for (const change of entry.changes ?? []) {
    const value = change.value
    const phoneNumberId = value.metadata?.phone_number_id
    if (!phoneNumberId) continue

    const db = getAdminDb()
    const lookupSnap = await db.collection('phone_number_lookup').doc(phoneNumberId).get()
    if (!lookupSnap.exists) {
      console.warn(`[Webhook] phone_number_id não mapeado: ${phoneNumberId}`)
      continue
    }

    const { projectId, wabaId } = lookupSnap.data() as { projectId: string; wabaId: string }

    // Busca configuração n8n por projeto (URL + token individuais)
    const projectSnap = await db.collection('projects').doc(projectId).get()
    const projectData = projectSnap.data() as { n8nWebhookUrl?: string; webhookToken?: string } | undefined
    const n8nUrl = projectData?.n8nWebhookUrl || N8N_WEBHOOK_URL
    const webhookToken = projectData?.webhookToken || process.env.N8N_WEBHOOK_SECRET_TOKEN

    await Promise.allSettled([
      ...(value.messages ?? []).map(msg =>
        Promise.allSettled([
          processIncomingMessage(projectId, phoneNumberId, value, msg),
          forwardToN8n(buildMessagePayload(projectId, wabaId, phoneNumberId, value, msg), n8nUrl, webhookToken),
        ]),
      ),
      ...(value.statuses ?? []).map(status =>
        Promise.allSettled([
          processMessageStatus(projectId, status),
          forwardToN8n(buildStatusPayload(projectId, wabaId, phoneNumberId, status), n8nUrl, webhookToken),
        ]),
      ),
    ])
  }
}

/* ─── Mensagem recebida: upsert da conversa + criação da mensagem ────────── */
async function processIncomingMessage(
  projectId: string,
  phoneNumberId: string,
  value: WebhookValue,
  msg: WebhookMessage,
) {
  const contactName = value.contacts?.[0]?.profile?.name ?? msg.from
  const content = msg.text?.body ?? extractMediaLabel(msg)
  const timestamp = Timestamp.fromMillis(parseInt(msg.timestamp) * 1000)

  // ID determinístico: garante uma conversa por (projeto + número do contato)
  const conversationId = `${projectId}_${msg.from}`

  const db = getAdminDb()
  const batch = db.batch()

  batch.set(db.collection('conversations').doc(conversationId), {
    projectId,
    phoneNumberId,
    phoneNumber: msg.from,
    clientName: contactName,
    lastMessage: content,
    lastMessageTime: timestamp,
    status: 'active',
    unreadCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // Usa o ID do Meta como chave para garantir idempotência
  batch.set(db.collection('messages').doc(msg.id), {
    projectId,
    conversationId,
    metaMessageId: msg.id,
    senderId: msg.from,
    senderType: 'client',
    content,
    mediaType: msg.type !== 'text' ? msg.type : null,
    timestamp,
    read: false,
    deliveryStatus: 'delivered',
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}

/* ─── Status de entrega: atualiza a mensagem enviada ────────────────────── */
async function processMessageStatus(projectId: string, status: WebhookStatus) {
  const snap = await getAdminDb()
    .collection('messages')
    .where('metaMessageId', '==', status.id)
    .where('projectId', '==', projectId)
    .limit(1)
    .get()

  if (snap.empty) return

  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  }

  await snap.docs[0].ref.update({
    deliveryStatus: statusMap[status.status] ?? status.status,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

function extractMediaLabel(msg: WebhookMessage): string {
  if (msg.image) return '📷 Imagem'
  if (msg.audio) return '🎵 Áudio'
  if (msg.video) return '🎥 Vídeo'
  if (msg.document) return `📄 ${msg.document.filename ?? 'Documento'}`
  if (msg.sticker) return '🪧 Figurinha'
  return '(mídia)'
}

/* ─── Tipos ──────────────────────────────────────────────────────────────── */
interface WebhookPayload {
  object: string
  entry: WebhookEntry[]
}
interface WebhookEntry {
  id: string
  changes: Array<{ value: WebhookValue; field: string }>
}
interface WebhookValue {
  messaging_product: string
  metadata: { display_phone_number: string; phone_number_id: string }
  contacts?: Array<{ profile: { name: string }; wa_id: string }>
  messages?: WebhookMessage[]
  statuses?: WebhookStatus[]
}
interface WebhookMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string }
  audio?: { id: string; mime_type: string }
  video?: { id: string; mime_type: string }
  document?: { id: string; filename?: string; mime_type: string }
  sticker?: { id: string }
}
interface WebhookStatus {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}
