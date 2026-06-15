import { requireAuth } from '@/lib/server-auth'
import { listTemplates } from '@/lib/meta'

async function getWabaConfig(projectId: string) {
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
      const wabaId = waba?.WABA_ID ?? waba?.wabaId
      const businessToken =
        (secSnap.data() as { businessToken?: string })?.businessToken ??
        waba?.BUSINESS_TOKEN ??
        waba?.businessToken
      if (wabaId && businessToken) return { wabaId: wabaId as string, businessToken }
    }
  } catch { /* Admin SDK não configurado */ }

  // 2. Fallback para variáveis de ambiente
  const wabaId = process.env.META_WABA_ID
  const businessToken = process.env.META_BUSINESS_TOKEN
  if (wabaId && businessToken) return { wabaId, businessToken }

  throw new Error('WABA não configurado. Configure as credenciais do projeto.')
}

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) {
    return Response.json({ error: 'projectId é obrigatório' }, { status: 400 })
  }

  try {
    const { wabaId, businessToken } = await getWabaConfig(projectId)
    const templates = await listTemplates(wabaId, businessToken)
    return Response.json({ templates })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = message.includes('não configurado') ? 503 : 502
    return Response.json({ error: message }, { status })
  }
}
