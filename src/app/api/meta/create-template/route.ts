import { cookies } from 'next/headers'
import { createTemplate, type TemplateCategory, type TemplateComponent } from '@/lib/meta'
import { firestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

async function requireAuth() {
  const store = await cookies()
  return !!store.get('session')
}

/**
 * Busca configuração Meta do Firestore
 */
async function getMetaConfig(projectId: string) {
  try {
    const projectRef = doc(firestore, 'projects', projectId)
    const projectSnap = await getDoc(projectRef)
    
    if (!projectSnap.exists()) {
      throw new Error('Projeto não encontrado')
    }

    const projectData = projectSnap.data()
    const wabaConfig = projectData?.wabaConfig

    if (!wabaConfig?.wabaId || !wabaConfig?.businessToken) {
      throw new Error('WABA não configurado. Contate o administrador.')
    }

    return {
      wabaId: wabaConfig.wabaId,
      businessToken: wabaConfig.businessToken,
    }
  } catch (error) {
    throw new Error(
      `Erro ao buscar configuração Meta do Firestore: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
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
    return Response.json({ error: 'Campos "name", "category" e "bodyText" são obrigatórios' }, { status: 400 })
  }

  if (!body.projectId) {
    return Response.json({ error: 'Campo "projectId" é obrigatório' }, { status: 400 })
  }

  let wabaId: string
  let businessToken: string

  try {
    const metaConfig = await getMetaConfig(body.projectId)
    wabaId = metaConfig.wabaId
    businessToken = metaConfig.businessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configuração Meta'
    return Response.json({ error: message }, { status: 503 })
  }

  // Monta os componentes: nome do template deve ser snake_case, sem espaços
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
    const result = await createTemplate(wabaId, businessToken, {
      name: templateName,
      category: body.category,
      language: body.language ?? 'pt_BR',
      components,
    })
    return Response.json({ ...result, name: templateName })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
