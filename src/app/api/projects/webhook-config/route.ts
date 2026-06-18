import { requireAuth } from '@/lib/server-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

function makeToken(): string {
  // Usa Web Crypto API (disponível em Node 18+ e Next.js App Router)
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// PUT: save per-project n8n webhook URL
export async function PUT(request: Request) {
  try {
    if (!(await requireAuth(request))) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, n8nWebhookUrl } = body as { projectId?: string; n8nWebhookUrl?: string }

    if (!projectId) {
      return Response.json({ error: 'projectId obrigatório' }, { status: 400 })
    }

    const db = getAdminDb()
    await db.collection('projects').doc(projectId).set(
      { n8nWebhookUrl: n8nWebhookUrl ?? '', updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )

    return Response.json({ success: true })
  } catch (err) {
    console.error('[webhook-config PUT]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// POST: regenerate webhook token
export async function POST(request: Request) {
  try {
    if (!(await requireAuth(request))) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId } = body as { projectId?: string }

    if (!projectId) {
      return Response.json({ error: 'projectId obrigatório' }, { status: 400 })
    }

    const webhookToken = makeToken()
    const db = getAdminDb()
    await db.collection('projects').doc(projectId).set(
      { webhookToken, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )

    return Response.json({ success: true, webhookToken })
  } catch (err) {
    console.error('[webhook-config POST]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
