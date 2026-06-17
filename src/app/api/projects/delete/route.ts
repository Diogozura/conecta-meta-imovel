import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'

export async function DELETE(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return Response.json({ error: 'projectId obrigatório' }, { status: 400 })
  }

  try {
    const db = getAdminDb()

    // Busca phoneNumberId para remover do índice de lookup
    const projectSnap = await db.collection('projects').doc(projectId).get()
    const phoneNumberId = projectSnap.data()?.waba?.phoneNumberId || projectSnap.data()?.waba?.PHONE_NUMBER_ID

    const batch = db.batch()
    batch.delete(db.collection('projects').doc(projectId))
    batch.delete(db.collection('project_secrets').doc(projectId))
    if (phoneNumberId) {
      batch.delete(db.collection('phone_number_lookup').doc(phoneNumberId))
    }
    await batch.commit()

    return Response.json({ success: true })
  } catch (err) {
    console.error('[delete-project]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Erro ao deletar' }, { status: 500 })
  }
}
