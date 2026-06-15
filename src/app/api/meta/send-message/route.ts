import { cookies } from 'next/headers'
import { sendTextMessage } from '@/lib/meta'
import { getAuth } from 'firebase/auth'
import { firestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

async function requireAuth() {
  const store = await cookies()
  return !!store.get('session')
}

/**
 * Busca configuração Meta do Firestore
 * Espera que o usuário tenha um projeto configurado
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

    if (!wabaConfig?.phoneNumberId || !wabaConfig?.businessToken) {
      throw new Error('WABA não configurado. Contate o administrador.')
    }

    return {
      phoneNumberId: wabaConfig.phoneNumberId,
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
    const metaConfig = await getMetaConfig(body.projectId)
    phoneNumberId = metaConfig.phoneNumberId
    businessToken = metaConfig.businessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configuração Meta'
    return Response.json({ error: message }, { status: 503 })
  }

  // Sanitiza o número: apenas dígitos
  const to = body.to.replace(/\D/g, '')
  if (to.length < 10) {
    return Response.json({ error: 'Número de telefone inválido' }, { status: 400 })
  }

  try {
    const result = await sendTextMessage(phoneNumberId, businessToken, to, body.message)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
