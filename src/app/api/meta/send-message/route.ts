import { requireAuth } from '@/lib/server-auth'
import { sendTextMessage } from '@/lib/meta'

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
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 502 }
    )
  }
}
