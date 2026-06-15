import { createHmac } from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

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

/* ─── POST: recebimento de eventos ──────────────────────────────────────── */
export async function POST(request: Request) {
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

  // Processa cada entry sem bloquear a resposta ao Meta (max 20s timeout)
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

    const { projectId } = lookupSnap.data() as { projectId: string }

    await Promise.allSettled([
      ...( value.messages ?? []).map(msg => processIncomingMessage(projectId, phoneNumberId, value, msg)),
      ...(value.statuses ?? []).map(status => processMessageStatus(projectId, status)),
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
