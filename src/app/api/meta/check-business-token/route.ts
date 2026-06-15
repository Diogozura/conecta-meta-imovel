import { requireAuth } from '@/lib/server-auth'

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const token = process.env.META_BUSINESS_TOKEN
  const appId = process.env.NEXT_PUBLIC_META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? 'v21.0'

  if (!token) {
    return Response.json({ error: 'META_BUSINESS_TOKEN não configurado' }, { status: 500 })
  }

  const url = new URL(`https://graph.facebook.com/${graphVersion}/debug_token`)
  url.searchParams.set('input_token', token)
  url.searchParams.set('access_token', `${appId}|${appSecret}`)

  const res = await fetch(url.toString())
  const debug = await res.json()

  const data = debug?.data
  const expiresAt: number = data?.expires_at ?? 0
  const isValid: boolean = data?.is_valid ?? false
  const tokenType: string = data?.type ?? 'desconhecido'
  const isPermanent = expiresAt === 0

  return Response.json({
    is_valid: isValid,
    type: tokenType,               // SYSTEM_USER = nunca expira; USER = expira em 60 dias
    expires_at: expiresAt,
    is_permanent: isPermanent,
    app_id: data?.app_id,
    scopes: data?.scopes,
    raw: debug,
  })
}

// Regenera o token do System User automaticamente via Graph API
// Requer: SYSTEM_USER_ID (encontre em Business Manager > Usuários do Sistema)
export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: { systemUserId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const systemUserId = body.systemUserId
  if (!systemUserId) {
    return Response.json({ error: 'Campo "systemUserId" obrigatório' }, { status: 400 })
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const businessToken = process.env.META_BUSINESS_TOKEN!
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? 'v21.0'

  // Gera um novo token permanente para o System User
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${systemUserId}/access_tokens`)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_app: appId,
      appsecret_proof: await computeAppSecretProof(businessToken, appSecret),
      scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
      access_token: businessToken,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return Response.json({ error: data?.error?.message ?? 'Falha ao gerar token', raw: data }, { status: 502 })
  }

  return Response.json({ access_token: data.access_token, token_type: data.token_type })
}

async function computeAppSecretProof(token: string, appSecret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}
