import { requireAuth } from '@/lib/server-auth'

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v21.0'}`

async function getProjectCredentials(projectId: string) {
  // 1. Tenta via Admin SDK
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const db = getAdminDb()
    const [projSnap, secSnap] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('project_secrets').doc(projectId).get(),
    ])
    if (projSnap.exists) {
      const waba = projSnap.data()?.waba
      const wabaId: string = waba?.WABA_ID ?? waba?.wabaId
      const businessToken: string =
        (secSnap.data() as { businessToken?: string })?.businessToken ??
        waba?.BUSINESS_TOKEN ??
        waba?.businessToken
      if (wabaId && businessToken) return { wabaId, businessToken }
    }
  } catch { /* Admin SDK não configurado */ }

  // 2. Fallback para env vars
  const wabaId = process.env.META_WABA_ID
  const businessToken = process.env.META_BUSINESS_TOKEN
  if (wabaId && businessToken) return { wabaId, businessToken }

  throw new Error('Credenciais Meta não encontradas. Configure o Firebase Admin SDK ou defina META_WABA_ID e META_BUSINESS_TOKEN no .env.local.')
}

async function resolveBusinessId(wabaId: string, token: string): Promise<string> {
  // Estratégia 1: env var manual (mais confiável — defina META_BUSINESS_ID no .env.local)
  const envId = process.env.META_BUSINESS_ID
  if (envId) return envId

  // Estratégia 2: campo "business" do próprio WABA (funciona com whatsapp_business_management)
  const wabaRes = await fetch(
    `${GRAPH}/${wabaId}?fields=id,name,business&access_token=${token}`
  )
  if (wabaRes.ok) {
    const wabaJson = await wabaRes.json()
    if (wabaJson.business?.id) return wabaJson.business.id as string
  }

  // Estratégia 3: /me/businesses (funciona com business_management em alguns fluxos)
  const meRes = await fetch(`${GRAPH}/me/businesses?access_token=${token}&fields=id,name&limit=1`)
  if (meRes.ok) {
    const meJson = await meRes.json()
    const biz = meJson.data?.[0]
    if (biz?.id) return biz.id as string
  }

  throw new Error(
    'Não foi possível determinar o Business ID automaticamente. ' +
    'Adicione META_BUSINESS_ID=<seu_id> no .env.local. ' +
    'Encontre o ID em: Meta Business Manager → Configurações → Informações da empresa → ID da conta empresarial.'
  )
}

export interface MetaPartner {
  id: string
  name: string
  picture?: string
  created_time?: string
  type?: string
}

// Tenta endpoints em ordem até um funcionar
async function fetchPartners(businessId: string, token: string): Promise<{ partners: MetaPartner[]; endpoint: string }> {
  const candidates = [
    {
      edge: 'client_businesses',
      url: `${GRAPH}/${businessId}/client_businesses?fields=id,name,profile_picture_uri,created_time&limit=50&access_token=${token}`,
      map: (b: Record<string, string>): MetaPartner => ({ id: b.id, name: b.name, picture: b.profile_picture_uri, created_time: b.created_time, type: 'business' }),
    },
    {
      edge: 'client_whatsapp_business_accounts',
      url: `${GRAPH}/${businessId}/client_whatsapp_business_accounts?fields=id,name,account_type,country,currency&limit=50&access_token=${token}`,
      map: (b: Record<string, string>): MetaPartner => ({ id: b.id, name: b.name ?? `WABA ${b.id}`, type: b.account_type ?? 'waba' }),
    },
    {
      edge: 'owned_whatsapp_business_accounts',
      url: `${GRAPH}/${businessId}/owned_whatsapp_business_accounts?fields=id,name,account_type,country&limit=50&access_token=${token}`,
      map: (b: Record<string, string>): MetaPartner => ({ id: b.id, name: b.name ?? `WABA ${b.id}`, type: b.account_type ?? 'waba' }),
    },
  ]

  let lastError = 'Nenhum endpoint retornou dados.'

  for (const candidate of candidates) {
    const res = await fetch(candidate.url)
    const json = await res.json()

    if (res.ok && !json.error) {
      return {
        partners: (json.data ?? []).map(candidate.map),
        endpoint: candidate.edge,
      }
    }

    lastError = json?.error?.message ?? lastError
  }

  throw new Error(lastError)
}

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId é obrigatório' }, { status: 400 })

  try {
    const { wabaId, businessToken } = await getProjectCredentials(projectId)
    const businessId = await resolveBusinessId(wabaId, businessToken)
    const { partners, endpoint } = await fetchPartners(businessId, businessToken)

    return Response.json({ partners, businessId, endpoint })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
