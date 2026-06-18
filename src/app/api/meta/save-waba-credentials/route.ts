import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
function makeToken(): string {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface SaveWabaBody {
  projectId: string
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  verifiedName: string
  businessToken: string
  tryTokenExchange?: boolean
}

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v21.0'}`

/**
 * Tenta trocar o User Access Token do EmbeddedSignup por um System User Token
 * com escopo whatsapp_business_messaging, via POST /{business_id}/access_token.
 * Se falhar por qualquer motivo, retorna o token original sem lançar erro.
 */
async function tryExchangeForSystemUserToken(
  wabaId: string,
  userToken: string,
): Promise<{ token: string; exchanged: boolean }> {
  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) return { token: userToken, exchanged: false }

    // 1. Busca o business_id a partir do WABA
    const wabaRes = await fetch(
      `${GRAPH}/${wabaId}?fields=id,business&access_token=${userToken}`,
    )
    if (!wabaRes.ok) return { token: userToken, exchanged: false }
    const wabaData = await wabaRes.json() as { business?: { id: string } }
    const businessId = wabaData.business?.id
    if (!businessId) return { token: userToken, exchanged: false }

    // 2. Solicita System User Token com whatsapp_business_messaging
    const params = new URLSearchParams({
      app_id: appId,
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
    })
    const exchangeRes = await fetch(`${GRAPH}/${businessId}/access_token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!exchangeRes.ok) {
      const err = await exchangeRes.json().catch(() => ({}))
      console.warn('[save-waba-credentials] Token exchange failed:', err)
      return { token: userToken, exchanged: false }
    }

    const data = await exchangeRes.json() as { access_token?: string }
    if (!data.access_token) return { token: userToken, exchanged: false }

    console.log('[save-waba-credentials] System User Token obtained automatically')
    return { token: data.access_token, exchanged: true }
  } catch (err) {
    console.warn('[save-waba-credentials] Token exchange error:', err)
    return { token: userToken, exchanged: false }
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: SaveWabaBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { projectId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, tryTokenExchange } = body
  let { businessToken } = body

  if (!projectId || !wabaId || !businessToken) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes: projectId, wabaId, businessToken' }, { status: 400 })
  }

  let tokenExchanged = false
  if (tryTokenExchange) {
    const result = await tryExchangeForSystemUserToken(wabaId, businessToken)
    businessToken = result.token
    tokenExchanged = result.exchanged
  }

  try {
    const db = getAdminDb()
    const projectRef = db.collection('projects').doc(projectId)

    // Preserva token existente — só gera um novo na primeira conexão
    const projectSnap = await projectRef.get()
    const existingToken = (projectSnap.data() as { webhookToken?: string })?.webhookToken
    const webhookToken = existingToken ?? makeToken()

    const batch = db.batch()

    // 1. Dados públicos do projeto
    batch.set(projectRef, {
      waba: {
        wabaId,
        phoneNumberId: phoneNumberId ?? '',
        displayPhoneNumber: displayPhoneNumber ?? '',
        verifiedName: verifiedName ?? '',
      },
      webhookToken,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 2. Token isolado em coleção restrita
    const secretRef = db.collection('project_secrets').doc(projectId)
    batch.set(secretRef, {
      projectId,
      businessToken,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 3. Índice de roteamento para o webhook
    if (phoneNumberId) {
      const lookupRef = db.collection('phone_number_lookup').doc(phoneNumberId)
      batch.set(lookupRef, {
        projectId,
        wabaId,
        displayPhoneNumber: displayPhoneNumber ?? '',
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    return Response.json({ success: true, tokenExchanged })
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err)
    console.error('[save-waba-credentials] Falha ao gravar no Firestore:', detail)
    return Response.json({ error: 'Erro ao salvar credenciais', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
