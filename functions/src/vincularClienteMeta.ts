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
    // System User Token — usado apenas para debug_token; /register não é chamado no CoEx.
    const systemUserToken = process.env.META_SYSTEM_USER_TOKEN

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
          `?fields=id,display_phone_number,verified_name,quality_rating` +
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

      // Modelo CoEx: NÃO chamamos POST /{phone_number_id}/register.
      // O número já está ativo via QR Code no celular do cliente. Chamar /register
      // manualmente derrubaria o aplicativo WhatsApp Business do celular.

      /* ── 4. Persistir no Firestore em /clientes/{clienteId} ──────────────
         (era step 5; step 4 — registro manual — eliminado no modelo CoEx)    */
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

      /* ── 5. Índice de roteamento: phone_number_id → clienteId ──────────── */
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
    quality_rating: string
  }>
  error?: { message: string }
}
