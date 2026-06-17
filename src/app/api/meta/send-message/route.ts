import { requireAuth } from '@/lib/server-auth'
import { sendTextMessage } from '@/lib/meta'

function extractUserId(request: Request): string {
  try {
    const header = request.headers.get('Authorization') ?? ''
    const parts = header.slice(7).split('.')
    if (parts.length !== 3) return 'agent'
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return typeof payload.sub === 'string' ? payload.sub : 'agent'
  } catch {
    return 'agent'
  }
}

async function saveOutgoingMessage(
  conversationId: string,
  projectId: string,
  phoneNumberId: string,
  to: string,
  message: string,
  metaMessageId: string | null,
  userId: string,
) {
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const { FieldValue } = await import('firebase-admin/firestore')
    const db = getAdminDb()
    const batch = db.batch()

    batch.set(db.collection('conversations').doc(conversationId), {
      projectId,
      phoneNumberId,
      phoneNumber: to,
      lastMessage: message,
      lastMessageTime: FieldValue.serverTimestamp(),
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    batch.set(db.collection('messages').doc(), {
      projectId,
      conversationId,
      metaMessageId,
      senderId: userId,
      senderType: 'user',
      content: message,
      mediaType: null,
      timestamp: FieldValue.serverTimestamp(),
      read: true,
      deliveryStatus: 'sent',
      createdAt: FieldValue.serverTimestamp(),
    })

    await batch.commit()
  } catch (err) {
    console.error('[send-message] Firestore write error:', err)
  }
}

async function getMetaConfig(projectId: string) {
  // 1. Tenta via Admin SDK (bypassa regras do Firestore)
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const db = getAdminDb()
    const [projSnap, secSnap] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('project_secrets').doc(projectId).get(),
    ])
    if (projSnap.exists) {
      const waba = projSnap.data()?.waba
      const phoneNumberId = waba?.PHONE_NUMBER_ID ?? waba?.phoneNumberId
      const businessToken =
        (secSnap.data() as { businessToken?: string })?.businessToken ??
        waba?.BUSINESS_TOKEN ??
        waba?.businessToken
      if (phoneNumberId && businessToken) return { phoneNumberId: phoneNumberId as string, businessToken }
    }
  } catch { /* Admin SDK não configurado */ }

  // 2. Fallback para variáveis de ambiente
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  const businessToken = process.env.META_BUSINESS_TOKEN
  if (phoneNumberId && businessToken) return { phoneNumberId, businessToken }

  throw new Error('WABA não configurado. Configure as credenciais do projeto.')
}

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const userId = extractUserId(request)

  let body: { to?: string; message?: string; projectId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.to || !body.message) {
    return Response.json({ error: 'Campos "to" e "message" são obrigatórios' }, { status: 400 })
  }
  if (!body.projectId) {
    return Response.json({ error: 'Campo "projectId" é obrigatório' }, { status: 400 })
  }

  let phoneNumberId: string
  let businessToken: string
  try {
    const config = await getMetaConfig(body.projectId)
    phoneNumberId = config.phoneNumberId
    businessToken = config.businessToken
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar configuração Meta' },
      { status: 503 }
    )
  }

  const to = body.to.replace(/\D/g, '')
  if (to.length < 10) {
    return Response.json({ error: 'Número de telefone inválido' }, { status: 400 })
  }

  try {
    const result = await sendTextMessage(phoneNumberId, businessToken, to, body.message)
    const conversationId = `${body.projectId}_${to}`
    void saveOutgoingMessage(
      conversationId, body.projectId, phoneNumberId, to, body.message,
      (result as { messages?: { id: string }[] })?.messages?.[0]?.id ?? null,
      userId,
    )
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 502 }
    )
  }
}
