import { requireAuth } from '@/lib/server-auth'
import { registerPhoneNumber } from '@/lib/meta'

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: { phoneNumberId?: string; accessToken?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.phoneNumberId) {
    return Response.json({ error: 'Campo "phoneNumberId" é obrigatório' }, { status: 400 })
  }

  // Usa o System User Token do Tech Provider — o user token do Embedded Signup
  // não tem permissão para registrar números em WABAs de clientes.
  const businessToken = process.env.META_BUSINESS_TOKEN
  if (!businessToken) {
    return Response.json({ error: 'META_BUSINESS_TOKEN não configurado no servidor' }, { status: 500 })
  }

  try {
    const result = await registerPhoneNumber(body.phoneNumberId, businessToken, body.pin)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
