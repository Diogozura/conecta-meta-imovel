import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const GRAPH = 'https://graph.facebook.com/v21.0'

/**
 * vincularClienteMeta
 * POST { accessToken: string, clienteId: string }
 *
 * Fluxo completo de vinculação:
 *   1. Inspeciona o token do cliente via /debug_token
 *   2. Extrai waba_id de granular_scopes
 *   3. Lista telefones do WABA
 *   4. Registra o número na Cloud API (com System User Token do Tech Provider)
 *   5. Salva em /clientes/{clienteId} no Firestore
 *   6. Indexa phone_number_id → clienteId para roteamento de webhook
 */
export const vincularClienteMeta = onRequest(
  { region: 'southamerica-east1', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' })
      return
    }

    const { accessToken, clienteId } = req.body as {
      accessToken?: string
      clienteId?: string
    }

    if (!accessToken || !clienteId) {
      res.status(400).json({ error: 'accessToken e clienteId são obrigatórios' })
      return
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    // Token do System User do Tech Provider (usado para operações privilegiadas)
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN
    const registrationPin = process.env.META_REGISTRATION_PIN ?? '123456'

    if (!appId || !appSecret || !systemUserToken) {
      console.error('[vincularClienteMeta] Variáveis de ambiente ausentes')
      res.status(500).json({ error: 'Configuração do servidor incompleta' })
      return
    }

    try {
      /* ── 1. Inspecionar token via /debug_token ──────────────────────────── */
      const debugUrl = new URL(`${GRAPH}/debug_token`)
      debugUrl.searchParams.set('input_token', accessToken)
      // App Token = App ID | App Secret (não é um token do usuário)
      debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`)

      const debugRes = await fetch(debugUrl.toString())
      const debugData = await debugRes.json() as DebugTokenResponse

      if (!debugData.data?.is_valid) {
        res.status(400).json({
          error: 'Token do cliente inválido ou expirado',
          detail: debugData.data?.error?.message,
        })
        return
      }

      /* ── 2. Extrair waba_id dos granular_scopes ─────────────────────────── */
      const scopes = debugData.data.granular_scopes ?? []
      const wabaIds =
        scopes.find((s) => s.scope === 'whatsapp_business_management')
          ?.target_ids ?? []
      const wabaId = wabaIds[0]

      if (!wabaId) {
        res.status(400).json({
          error: 'Nenhuma WABA encontrada no token',
          detail:
            'O usuário pode não ter concluído o Embedded Signup ou não possuir uma conta WhatsApp Business.',
        })
        return
      }

      /* ── 3. Listar telefones do WABA ────────────────────────────────────── */
      const phonesRes = await fetch(
        `${GRAPH}/${wabaId}/phone_numbers` +
          `?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating` +
          `&access_token=${accessToken}`,
      )
      const phonesData = await phonesRes.json() as PhoneNumbersResponse

      if (!phonesRes.ok || !phonesData.data?.length) {
        res.status(400).json({
          error: 'Nenhum número de telefone encontrado na WABA',
          detail: phonesData.error?.message,
        })
        return
      }

      const phone = phonesData.data[0]
      const phoneNumberId = phone.id
      const displayPhoneNumber = phone.display_phone_number
      const verifiedName = phone.verified_name

      /* ── 4. Registrar número na Cloud API ───────────────────────────────── */
      // O System User Token do Tech Provider é necessário aqui pois o token do
      // usuário final não tem permissão para registrar em WABAs de clientes.
      const registerRes = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${systemUserToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: registrationPin,
        }),
      })

      if (!registerRes.ok) {
        const registerErr = await registerRes.json() as { error?: { message: string; error_subcode?: number } }
        // subcode 2688049 = número já registrado — não é um erro bloqueante
        if (registerErr.error?.error_subcode !== 2688049) {
          res.status(502).json({
            error: 'Falha ao registrar número na Cloud API',
            detail: registerErr.error?.message,
          })
          return
        }
      }

      /* ── 5. Persistir no Firestore em /clientes/{clienteId} ─────────────── */
      const clienteRef = db.collection('clientes').doc(clienteId)
      await clienteRef.set(
        {
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          verified_name: verifiedName,
          // Armazena o token do cliente para chamadas em nome dele.
          // Em produção considere usar um System User da WABA do cliente.
          access_token: accessToken,
          status: 'ativo',
          vinculadoEm: FieldValue.serverTimestamp(),
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      /* ── 6. Índice de roteamento: phone_number_id → clienteId ───────────── */
      await db.collection('phone_number_lookup').doc(phoneNumberId).set(
        {
          clienteId,
          wabaId,
          displayPhoneNumber,
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      res.status(200).json({
        success: true,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        verified_name: verifiedName,
      })
    } catch (err) {
      console.error('[vincularClienteMeta] Erro inesperado:', err)
      res.status(500).json({ error: 'Erro interno no servidor' })
    }
  },
)

/* ── Tipos ──────────────────────────────────────────────────────────────────── */

interface DebugTokenResponse {
  data: {
    is_valid: boolean
    error?: { message: string }
    granular_scopes: Array<{ scope: string; target_ids?: string[] }>
  }
}

interface PhoneNumbersResponse {
  data: Array<{
    id: string
    display_phone_number: string
    verified_name: string
    code_verification_status: string
    quality_rating: string
  }>
  error?: { message: string }
}
