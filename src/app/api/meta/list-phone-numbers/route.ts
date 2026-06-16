import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v21.0'}`

export interface WabaPhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  code_verification_status: string
  quality_rating: string
}

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId é obrigatório' }, { status: 400 })

  try {
    const db = getAdminDb()
    const [projSnap, secSnap] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('project_secrets').doc(projectId).get(),
    ])

    if (!projSnap.exists) {
      return Response.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const waba = projSnap.data()?.waba
    const wabaId: string = waba?.WABA_ID ?? waba?.wabaId
    const businessToken: string =
      (secSnap.data() as { businessToken?: string })?.businessToken ?? ''

    if (!wabaId || !businessToken) {
      return Response.json({ error: 'WABA não configurada neste projeto' }, { status: 422 })
    }

    const res = await fetch(
      `${GRAPH}/${wabaId}/phone_numbers` +
      `?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating` +
      `&access_token=${businessToken}`,
    )
    const json = await res.json()

    if (!res.ok) {
      throw new Error(json?.error?.message ?? 'Falha ao listar números de telefone')
    }

    return Response.json({ phoneNumbers: json.data ?? [], wabaId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
