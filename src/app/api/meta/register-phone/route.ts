import { requireAuth } from '@/lib/server-auth'
import { getPhoneVerificationStatus, registerPhoneNumber } from '@/lib/meta'

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Ponto 2 — o frontend não envia mais accessToken; apenas phoneNumberId e pin opcional.
  let body: { phoneNumberId?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.phoneNumberId) {
    return Response.json({ error: 'Campo "phoneNumberId" é obrigatório' }, { status: 400 })
  }

  // Ponto 2 — System User Token do Tech Provider (Business Manager permanente).
  // Nunca use o User Access Token temporário do cliente aqui — a Meta bloqueia com
  // "does not exist, cannot be loaded due to missing permissions".
  // Configure META_BUSINESS_TOKEN no .env.local com o token do Usuário do Sistema
  // gerado em: Meta Business Suite → Configurações → Usuários do sistema → Gerar token.
  const systemUserToken = process.env.META_BUSINESS_TOKEN
  if (!systemUserToken) {
    return Response.json(
      { error: 'META_BUSINESS_TOKEN não configurado no servidor' },
      { status: 500 },
    )
  }

  try {
    // Ponto 3 — verifica status antes de tentar registrar.
    // Se o usuário demorou no pop-up ou pulou a etapa de verificação, o status
    // retorna "EXPIRED" e a chamada /register falharia com erro 400 da Meta.
    const verificationStatus = await getPhoneVerificationStatus(
      body.phoneNumberId,
      systemUserToken,
    )

    if (verificationStatus !== 'VERIFIED') {
      return Response.json(
        {
          error:
            'O código de verificação expirou ou o número não foi validado no pop-up. ' +
            'Reinicie o processo de conexão com a Meta.',
          code_verification_status: verificationStatus,
        },
        { status: 422 },
      )
    }

    const result = await registerPhoneNumber(body.phoneNumberId, systemUserToken, body.pin)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: message }, { status: 502 })
  }
}
