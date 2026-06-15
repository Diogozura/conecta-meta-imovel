import { requireAuth } from '@/lib/server-auth'
import { createTemplate, type TemplateCategory, type TemplateComponent } from '@/lib/meta'

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

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: {
    name?: string
    category?: TemplateCategory
    language?: string
    header?: string
    bodyText?: string
    footer?: string
    projectId?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.name || !body.category || !body.bodyText) {
    return Response.json({ error: '"name", "category" e "bodyText" são obrigatórios' }, { status: 400 })
  }
  if (!body.projectId) {
    return Response.json({ error: '"projectId" é obrigatório' }, { status: 400 })
  }

  const templateName = body.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

  const components: TemplateComponent[] = []
  if (body.header?.trim()) {
    components.push({ type: 'HEADER', format: 'TEXT', text: body.header.trim() })
  }
  components.push({ type: 'BODY', text: body.bodyText.trim() })
  if (body.footer?.trim()) {
    components.push({ type: 'FOOTER', text: body.footer.trim() })
  }

  try {
    const { wabaId, businessToken } = await getWabaConfig(body.projectId)
    const result = await createTemplate(wabaId, businessToken, {
      name: templateName,
      category: body.category,
      language: body.language ?? 'pt_BR',
      components,
    })
    return Response.json({ ...result, name: templateName })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = message.includes('não configurado') ? 503 : 502
    return Response.json({ error: message }, { status })
  }
}
