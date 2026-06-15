import { requireAuth } from '@/lib/server-auth'
import { subscribeToWebhooks } from '@/lib/meta'

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: { wabaId?: string; accessToken?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.wabaId) {
    return Response.json({ error: 'Campo "wabaId" é obrigatório' }, { status: 400 })
  }

  // Usa o System User Token do Tech Provider — o user token do Embedded Signup
  // não tem permissão para assinar webhooks em WABAs de clientes.
  const businessToken = process.env.META_BUSINESS_TOKEN
  if (!businessToken) {
    return Response.json({ error: 'META_BUSINESS_TOKEN não configurado no servidor' }, { status: 500 })
  }

  try {
    const result = await subscribeToWebhooks(body.wabaId, businessToken)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
