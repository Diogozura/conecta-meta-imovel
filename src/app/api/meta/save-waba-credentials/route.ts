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

  if (!projectId || !wabaId || !phoneNumberId || !businessToken) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  try {
    const db = getAdminDb()
    const batch = db.batch()

    // 1. Dados públicos do projeto — sem o token
    const projectRef = db.collection('projects').doc(projectId)
    batch.update(projectRef, {
      waba: { wabaId, phoneNumberId, displayPhoneNumber, verifiedName },
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 2. Token isolado em coleção restrita (regra: allow read, write: if false)
    const secretRef = db.collection('project_secrets').doc(projectId)
    batch.set(secretRef, {
      projectId,
      businessToken,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 3. Índice de roteamento para o webhook
    const lookupRef = db.collection('phone_number_lookup').doc(phoneNumberId)
    batch.set(lookupRef, {
      projectId,
      wabaId,
      displayPhoneNumber,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await batch.commit()

    return Response.json({ success: true })
  } catch (err) {
    console.error('[save-waba-credentials]', err)
    return Response.json({ error: 'Erro ao salvar credenciais' }, { status: 500 })
  }
}
