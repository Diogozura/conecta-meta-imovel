import { cookies } from 'next/headers'
import { listTemplates } from '@/lib/meta'
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

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Obter projectId da query string
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return Response.json({ error: 'Campo "projectId" é obrigatório' }, { status: 400 })
  }

  let wabaId: string
  let businessToken: string

  try {
    const metaConfig = await getMetaConfig(projectId)
    wabaId = metaConfig.wabaId
    businessToken = metaConfig.businessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configuração Meta'
    return Response.json({ error: message }, { status: 503 })
  }

  try {
    const templates = await listTemplates(wabaId, businessToken)
    return Response.json({ templates })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
