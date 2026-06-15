import { requireAuth } from '@/lib/server-auth'

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: { accessToken?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.accessToken) {
    return Response.json({ error: 'Campo "accessToken" obrigatório' }, { status: 400 })
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? 'v21.0'

  const url = new URL(`https://graph.facebook.com/${graphVersion}/debug_token`)
  url.searchParams.set('input_token', body.accessToken)
  url.searchParams.set('access_token', `${appId}|${appSecret}`)

  const res = await fetch(url.toString())
  const data = await res.json()
  return Response.json(data)
}
