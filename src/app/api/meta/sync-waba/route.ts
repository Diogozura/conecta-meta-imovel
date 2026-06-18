import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
function makeToken(): string {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? 'v21.0'}`

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: { sourceProjectId: string; wabaId: string; targetProjectName: string; ownerId: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { sourceProjectId, wabaId, targetProjectName, ownerId } = body

  if (!sourceProjectId || !wabaId || !targetProjectName || !ownerId) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const db = getAdminDb()

  // 1. Busca o token do projeto-origem
  const secSnap = await db.collection('project_secrets').doc(sourceProjectId).get()
  const businessToken: string = (secSnap.data() as { businessToken?: string })?.businessToken ?? ''
  if (!businessToken) {
    return Response.json({ error: 'Token não encontrado para o projeto de origem. Reconecte a conta.' }, { status: 404 })
  }

  // 2. Busca números de telefone da WABA alvo
  let phoneNumberId = ''
  let displayPhoneNumber = ''
  let verifiedName = ''

  try {
    const phonesRes = await fetch(
      `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${businessToken}`
    )
    if (phonesRes.ok) {
      const phonesJson = await phonesRes.json()
      const first = phonesJson.data?.[0]
      if (first) {
        phoneNumberId = first.id ?? ''
        displayPhoneNumber = first.display_phone_number ?? ''
        verifiedName = first.verified_name ?? ''
      }
    } else {
      const err = await phonesRes.json().catch(() => ({}))
      console.warn('[sync-waba] phone_numbers error:', err)
    }
  } catch (e) {
    console.warn('[sync-waba] Falha ao buscar números (não crítico):', e)
  }

  // 3. Cria o projeto e salva credenciais em batch
  const projectRef = db.collection('projects').doc()
  const batch = db.batch()
  const webhookToken = makeToken()

  batch.set(projectRef, {
    name: targetProjectName,
    owner: ownerId,
    wabaId,
    collaborators: [],
    status: 'active',
    webhookToken,
    waba: {
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  batch.set(db.collection('project_secrets').doc(projectRef.id), {
    projectId: projectRef.id,
    businessToken,
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (phoneNumberId) {
    batch.set(db.collection('phone_number_lookup').doc(phoneNumberId), {
      projectId: projectRef.id,
      wabaId,
      displayPhoneNumber,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  try {
    await batch.commit()
  } catch (err) {
    console.error('[sync-waba] Firestore batch error:', err)
    return Response.json({ error: 'Erro ao salvar no banco de dados' }, { status: 500 })
  }

  return Response.json({
    projectId: projectRef.id,
    wabaId,
    phoneNumberId,
    displayPhoneNumber,
    verifiedName,
  })
}
