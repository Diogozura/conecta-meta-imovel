import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

interface SaveWabaBody {
  projectId: string
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  verifiedName: string
  businessToken: string
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

  const { projectId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, businessToken } = body

  // phoneNumberId é opcional no modo CoEx — o número já está ativo via QR Code
  if (!projectId || !wabaId || !businessToken) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes: projectId, wabaId, businessToken' }, { status: 400 })
  }

  try {
    const db = getAdminDb()
    const batch = db.batch()

    // 1. Dados públicos do projeto — usa set+merge para funcionar mesmo se o doc ainda não existir
    const projectRef = db.collection('projects').doc(projectId)
    batch.set(projectRef, {
      waba: { wabaId, phoneNumberId: phoneNumberId ?? '', displayPhoneNumber: displayPhoneNumber ?? '', verifiedName: verifiedName ?? '' },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 2. Token isolado em coleção restrita (regra: allow read, write: if false)
    const secretRef = db.collection('project_secrets').doc(projectId)
    batch.set(secretRef, {
      projectId,
      businessToken,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 3. Índice de roteamento para o webhook — só cria se tiver phoneNumberId
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

    return Response.json({ success: true })
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err)
    console.error('[save-waba-credentials] Falha ao gravar no Firestore:', detail)
    return Response.json({ error: 'Erro ao salvar credenciais', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
