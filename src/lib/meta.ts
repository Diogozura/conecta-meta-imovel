const GRAPH_API = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v21.0'}`

/**
 * Troca o code retornado pelo Embedded Signup por um User Access Token do cliente.
 *
 * Ponto 1 — App ID: usa META_APP_ID (server-only) com fallback para
 * NEXT_PUBLIC_META_APP_ID. Isso garante que o App ID do backend é o mesmo
 * que inicializou o SDK no frontend, evitando o erro de permissão da Meta
 * quando os valores divergem entre ambientes (ex: Vercel Preview vs Production).
 */
export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string }> {
  // META_APP_ID (sem NEXT_PUBLIC_) é a fonte de verdade no servidor.
  // Defina-o no .env.local/.env de produção com o mesmo valor do App ID do seu app Meta.
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID
  if (!appId) throw new Error('META_APP_ID não configurado no servidor')

  const url = new URL('https://graph.facebook.com/oauth/access_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao trocar token')
  }
  return res.json()
}

/**
 * Consulta o status de verificação de código de um número de telefone.
 * Deve ser chamado com o System User Token do Tech Provider.
 */
export async function getPhoneVerificationStatus(
  phoneNumberId: string,
  systemUserToken: string,
): Promise<string> {
  const res = await fetch(
    `${GRAPH_API}/${phoneNumberId}?fields=code_verification_status`,
    { headers: { Authorization: `Bearer ${systemUserToken}` } },
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao consultar status do número')
  }
  const data = await res.json()
  return (data.code_verification_status as string) ?? 'UNKNOWN'
}

/**
 * Registra o número de telefone para uso com a Cloud API.
 *
 * Ponto 2 — Segregação de tokens: este parâmetro DEVE receber o
 * System User Token (META_BUSINESS_TOKEN) do Tech Provider, nunca
 * o User Access Token temporário do cliente retornado pelo Embedded Signup.
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  systemUserToken: string,
  pin = '000000',
) {
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${systemUserToken}`,
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao registrar telefone')
  }
  return res.json()
}

/** Inscreve o app nos webhooks de um WABA. */
export async function subscribeToWebhooks(wabaId: string, accessToken: string) {
  const res = await fetch(`${GRAPH_API}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao assinar webhooks')
  }
  return res.json()
}

/** Envia uma mensagem de texto simples via Cloud API. */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao enviar mensagem')
  }
  return res.json()
}

/** Envia uma mensagem usando um template aprovado. */
export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode = 'pt_BR',
  components: object[] = [],
) {
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao enviar template')
  }
  return res.json()
}

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER'
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
}

export interface MetaTemplate {
  id: string
  name: string
  status: string
  category: TemplateCategory
  language: string
  components: TemplateComponent[]
}

/** Cria um template de mensagem no WABA. */
export async function createTemplate(
  wabaId: string,
  accessToken: string,
  payload: {
    name: string
    category: TemplateCategory
    language: string
    components: TemplateComponent[]
  },
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${GRAPH_API}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao criar template')
  }
  return res.json()
}

/** Lista os templates existentes no WABA. */
export async function listTemplates(
  wabaId: string,
  accessToken: string,
): Promise<MetaTemplate[]> {
  const url = new URL(`${GRAPH_API}/${wabaId}/message_templates`)
  url.searchParams.set('fields', 'id,name,status,category,language,components')
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Falha ao listar templates')
  }
  const json = await res.json()
  return json.data ?? []
}
