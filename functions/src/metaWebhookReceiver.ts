import { onRequest } from 'firebase-functions/v2/https'
import { createHmac } from 'crypto'
import * as admin from 'firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

// URL do webhook no n8n — configure em process.env.N8N_WEBHOOK_URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? ''

/**
 * metaWebhookReceiver
 *
 * Endpoint único registrado no painel da Meta como Callback URL.
 * GET  → verificação do hub (retorna hub.challenge)
 * POST → recebe eventos e:
 *          (a) retransmite o payload bruto para o n8n
 *          (b) persiste mensagens/status no Firestore
 */
export const metaWebhookReceiver = onRequest(
  { region: 'southamerica-east1' },
  async (req, res) => {
    /* ── GET: verificação do endpoint pela Meta ─────────────────────────── */
    if (req.method === 'GET') {
      const mode = req.query['hub.mode']
      const token = req.query['hub.verify_token']
      const challenge = req.query['hub.challenge']

      if (
        mode === 'subscribe' &&
        token === process.env.META_WEBHOOK_VERIFY_TOKEN
      ) {
        res.status(200).send(challenge)
      } else {
        res.status(403).send('Forbidden')
      }
      return
    }

    /* ── POST: recebimento de eventos ────────────────────────────────────── */
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    /* ── Validação de assinatura HMAC-SHA256 ────────────────────────────── */
    const appSecret = process.env.META_APP_SECRET ?? ''
    if (appSecret) {
      // req.rawBody é o buffer bruto — essencial para HMAC correto
      const rawBody = req.rawBody?.toString('utf8') ?? ''
      const signature = (req.headers['x-hub-signature-256'] as string) ?? ''
      const expected =
        'sha256=' +
        createHmac('sha256', appSecret).update(rawBody).digest('hex')

      if (signature !== expected) {
        console.warn('[Webhook] Assinatura inválida — possível requisição não autorizada')
        res.status(401).send('Unauthorized')
        return
      }
    }

    const payload = req.body as WebhookPayload

    if (payload.object !== 'whatsapp_business_account') {
      res.status(200).send('OK')
      return
    }

    // Responde à Meta imediatamente (requisito: < 20 segundos)
    res.status(200).send('OK')

    // Processa em background sem bloquear a resposta
    await Promise.allSettled([
      forwardToN8n(payload),
      processAllEntries(payload),
    ])
  },
)

/* ── Forward para o n8n ─────────────────────────────────────────────────────── */
async function forwardToN8n(payload: WebhookPayload): Promise<void> {
  if (!N8N_WEBHOOK_URL) return

  const secretToken = process.env.N8N_WEBHOOK_SECRET_TOKEN

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header de autenticação que o n8n valida no Webhook node
        ...(secretToken ? { 'X-Webhook-Token': secretToken } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(
        `[Webhook→n8n] Falha ao encaminhar: HTTP ${response.status}`,
      )
    }
  } catch (err) {
    console.error('[Webhook→n8n] Erro ao encaminhar payload:', err)
  }
}

/* ── Processamento dos eventos no Firestore ─────────────────────────────────── */
async function processAllEntries(payload: WebhookPayload): Promise<void> {
  await Promise.allSettled(payload.entry.map(processEntry))
}

async function processEntry(entry: WebhookEntry): Promise<void> {
  for (const change of entry.changes ?? []) {
    const value = change.value
    const phoneNumberId = value.metadata?.phone_number_id
    if (!phoneNumberId) continue

    // Resolve clienteId a partir do índice phone_number_lookup
    const lookupSnap = await db
      .collection('phone_number_lookup')
      .doc(phoneNumberId)
      .get()

    if (!lookupSnap.exists) {
      console.warn(`[Webhook] phone_number_id não mapeado: ${phoneNumberId}`)
      continue
    }

    const { clienteId } = lookupSnap.data() as { clienteId: string }

    await Promise.allSettled([
      ...(value.messages ?? []).map((msg) =>
        processIncomingMessage(clienteId, phoneNumberId, value, msg),
      ),
      ...(value.statuses ?? []).map((status) =>
        processMessageStatus(clienteId, status),
      ),
    ])
  }
}

async function processIncomingMessage(
  clienteId: string,
  phoneNumberId: string,
  value: WebhookValue,
  msg: WebhookMessage,
): Promise<void> {
  // Modelo CoEx: quando o dono do número envia uma mensagem pelo celular, a Meta
  // entrega um evento de "echo" onde msg.from === número do próprio negócio.
  // Normalizamos os números (remove não-dígitos) antes de comparar para lidar com
  // formatações diferentes entre o campo from e o display_phone_number do metadata.
  const normalize = (p: string) => p.replace(/\D/g, '')
  const isEcho = normalize(msg.from) === normalize(value.metadata.display_phone_number)

  // Para echoes, o contato é o destinatário (msg.to). Para mensagens recebidas, é o remetente.
  const contactPhone = isEcho ? (msg.to ?? msg.from) : msg.from
  const contactName = isEcho
    ? contactPhone
    : (value.contacts?.[0]?.profile?.name ?? msg.from)

  const content = msg.text?.body ?? extractMediaLabel(msg)
  const timestamp = Timestamp.fromMillis(parseInt(msg.timestamp) * 1000)
  const direction = isEcho ? 'outbound' : 'inbound'

  // ID determinístico: uma conversa por (clienteId + número do contato)
  const conversationId = `${clienteId}_${contactPhone}`
  const batch = db.batch()

  batch.set(
    db.collection('conversations').doc(conversationId),
    {
      clienteId,
      phoneNumberId,
      phoneNumber: contactPhone,
      contactName,
      lastMessage: content,
      lastMessageTime: timestamp,
      status: 'active',
      // Echoes (enviados pelo próprio celular) não incrementam mensagens não lidas
      ...(isEcho ? {} : { unreadCount: FieldValue.increment(1) }),
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  // ID da mensagem do Meta como chave — garante idempotência em re-entregas
  batch.set(db.collection('messages').doc(msg.id), {
    clienteId,
    conversationId,
    metaMessageId: msg.id,
    from: msg.from,
    ...(isEcho && msg.to ? { to: msg.to } : {}),
    direction,
    content,
    type: msg.type,
    timestamp,
    read: isEcho,               // echoes já são considerados lidos
    deliveryStatus: isEcho ? 'sent' : 'delivered',
    criadoEm: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}

async function processMessageStatus(
  clienteId: string,
  status: WebhookStatus,
): Promise<void> {
  const snap = await db
    .collection('messages')
    .where('metaMessageId', '==', status.id)
    .where('clienteId', '==', clienteId)
    .limit(1)
    .get()

  if (snap.empty) return

  await snap.docs[0].ref.update({
    deliveryStatus: status.status,
    atualizadoEm: FieldValue.serverTimestamp(),
  })
}

function extractMediaLabel(msg: WebhookMessage): string {
  if (msg.image) return '[Imagem]'
  if (msg.audio) return '[Áudio]'
  if (msg.video) return '[Vídeo]'
  if (msg.document) return `[Documento: ${msg.document.filename ?? 'arquivo'}]`
  if (msg.sticker) return '[Figurinha]'
  return '[Mídia]'
}

/* ── Tipos ──────────────────────────────────────────────────────────────────── */

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
  to?: string
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
