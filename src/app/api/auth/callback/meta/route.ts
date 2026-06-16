import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v25.0'}`

// ── Token exchange ────────────────────────────────────────────────────────────

async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID
  if (!appId) throw new Error('META_APP_ID não configurado no servidor')

  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('code', code)
  url.searchParams.set('redirect_uri', redirectUri) // deve ser idêntica à enviada no popup

  const res = await fetch(url.toString())
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? 'Falha na troca do código OAuth')
  return json.access_token as string
}

// ── WABA + phone discovery ────────────────────────────────────────────────────

interface WabaAssets {
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  verifiedName: string
}

async function discoverAssets(accessToken: string): Promise<WabaAssets | null> {
  let wabaId = ''

  // Estratégia 1: granular_scopes via debug_token (mais preciso — retorna o WABA que o usuário autorizou)
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID
  const appToken = `${appId}|${process.env.META_APP_SECRET}`
  try {
    const dbgRes = await fetch(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`,
    )
    if (dbgRes.ok) {
      const { data } = await dbgRes.json()
      const scopes: Array<{ scope: string; target_ids?: string[] }> = data?.granular_scopes ?? []
      wabaId = scopes.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0] ?? ''
    }
  } catch { /* fallback abaixo */ }

  // Estratégia 2: /me/whatsapp_business_accounts (token do usuário)
  if (!wabaId) {
    try {
      const meRes = await fetch(`${GRAPH}/me/whatsapp_business_accounts?access_token=${accessToken}`)
      if (meRes.ok) {
        const meJson = await meRes.json()
        wabaId = meJson.data?.[0]?.id ?? ''
      }
    } catch { /* ignora */ }
  }

  if (!wabaId) return null

  // Busca o primeiro número de telefone da WABA
  let phoneNumberId = ''
  let displayPhoneNumber = ''
  let verifiedName = ''

  try {
    const phonesRes = await fetch(
      `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`,
    )
    if (phonesRes.ok) {
      const phonesJson = await phonesRes.json()
      const first = phonesJson.data?.[0]
      if (first) {
        phoneNumberId = first.id ?? ''
        displayPhoneNumber = first.display_phone_number ?? ''
        verifiedName = first.verified_name ?? ''
      }
    }
  } catch { /* ignora */ }

  return { wabaId, phoneNumberId, displayPhoneNumber, verifiedName }
}

// ── Firestore save ────────────────────────────────────────────────────────────

async function saveCredentials(
  projectId: string,
  assets: WabaAssets,
  businessToken: string,
): Promise<void> {
  const db = getAdminDb()
  const batch = db.batch()

  // 1. Dados públicos do projeto
  batch.set(
    db.collection('projects').doc(projectId),
    {
      waba: {
        wabaId: assets.wabaId,
        phoneNumberId: assets.phoneNumberId,
        displayPhoneNumber: assets.displayPhoneNumber,
        verifiedName: assets.verifiedName,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  // 2. Token em coleção restrita (regra: allow read, write: if false)
  batch.set(
    db.collection('project_secrets').doc(projectId),
    {
      projectId,
      businessToken,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  // 3. Índice de roteamento para o webhook
  if (assets.phoneNumberId) {
    batch.set(db.collection('phone_number_lookup').doc(assets.phoneNumberId), {
      projectId,
      wabaId: assets.wabaId,
      displayPhoneNumber: assets.displayPhoneNumber,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
}

// ── n8n notification (fire-and-forget) ───────────────────────────────────────

function notifyN8n(projectId: string, assets: WabaAssets): void {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return

  const secretToken = process.env.N8N_WEBHOOK_SECRET_TOKEN
  void fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secretToken ? { 'X-Webhook-Token': secretToken } : {}),
    },
    body: JSON.stringify({
      event: 'waba_connected',
      projectId,
      wabaId: assets.wabaId,
      phoneNumberId: assets.phoneNumberId,
      displayPhoneNumber: assets.displayPhoneNumber,
      verifiedName: assets.verifiedName,
    }),
  }).catch(() => { /* fire-and-forget */ })
}

// ── HTML popup helpers ────────────────────────────────────────────────────────

function buildPopupHtml(inlineScript: string, bodyMessage: string, isError = false): Response {
  const color = isError ? '#dc2626' : '#16a34a'
  const icon = isError ? '❌' : '✅'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jade Hub · Meta</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{display:flex;align-items:center;justify-content:center;
         min-height:100vh;background:#f9fafb;font-family:system-ui,sans-serif}
    .card{text-align:center;padding:2.5rem 2rem;max-width:380px}
    .icon{font-size:3rem;margin-bottom:1.25rem}
    .msg{color:${color};font-size:0.9375rem;line-height:1.6}
    .sub{color:#6b7280;font-size:0.8rem;margin-top:.75rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <p class="msg">${bodyMessage}</p>
    <p class="sub">Esta janela será fechada automaticamente.</p>
  </div>
  <script>${inlineScript}</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function successResponse(origin: string, assets: WabaAssets): Response {
  const payload = JSON.stringify({
    type: 'META_SIGNUP_RESULT',
    status: 'success',
    data: assets,
  })
  const script = [
    `if(window.opener){`,
    `  try{window.opener.postMessage(${payload},${JSON.stringify(origin)})}catch(e){}`,
    `}`,
    `setTimeout(()=>window.close(),1500)`,
  ].join('')

  return buildPopupHtml(
    script,
    'WhatsApp Business conectado com sucesso!',
  )
}

function errorResponse(origin: string, message: string): Response {
  const payload = JSON.stringify({
    type: 'META_SIGNUP_RESULT',
    status: 'error',
    message,
  })
  const script = [
    `if(window.opener){`,
    `  try{window.opener.postMessage(${payload},${JSON.stringify(origin)})}catch(e){}`,
    `}`,
    `setTimeout(()=>window.close(),3000)`,
  ].join('')

  return buildPopupHtml(script, message, true)
}

// ── GET: recebe o redirect da Meta após o Embedded Signup ─────────────────────

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { searchParams, origin } = url

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')

  // Usuário negou permissão ou a Meta retornou erro
  if (error || !code) {
    const msg =
      errorReason === 'user_denied'
        ? 'Autorização negada. Nenhuma alteração foi feita.'
        : 'Não foi possível obter o código de autorização da Meta.'
    return errorResponse(origin, msg)
  }

  // Decodifica o state que contém o projectId
  let projectId = ''
  try {
    const state = JSON.parse(atob(stateParam ?? ''))
    projectId = state.projectId ?? ''
  } catch {
    return errorResponse(origin, 'Parâmetro de estado inválido. Por favor tente novamente.')
  }

  if (!projectId) {
    return errorResponse(origin, 'Projeto não identificado. Selecione um projeto e tente novamente.')
  }

  try {
    // redirect_uri deve ser idêntica à usada no popup (construída a partir da mesma origin)
    const redirectUri = `${origin}/api/auth/callback/meta`

    // 1. Troca o código por um User Access Token do cliente
    const accessToken = await exchangeCode(code, redirectUri)

    // 2. Descobre WABA ID e número de telefone
    const assets = await discoverAssets(accessToken)
    if (!assets?.wabaId) {
      throw new Error(
        'Não foi possível identificar a WhatsApp Business Account. ' +
        'Certifique-se de completar o onboarding do WhatsApp no popup antes de fechar.',
      )
    }

    // 3. Persiste no Firestore via Admin SDK
    await saveCredentials(projectId, assets, accessToken)

    // 4. Notifica o n8n (fire-and-forget, não bloqueia o popup)
    notifyN8n(projectId, assets)

    // 5. Fecha o popup e notifica o opener
    return successResponse(origin, assets)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar a conexão.'
    console.error('[callback/meta]', message)
    return errorResponse(origin, message)
  }
}
