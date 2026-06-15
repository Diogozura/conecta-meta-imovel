/**
 * Verifica se a requisição tem um Firebase ID Token válido.
 *
 * Fluxo atual: verifica apenas a presença e estrutura JWT (3 segmentos Base64).
 * Quando o Firebase Admin SDK estiver configurado, substituir por:
 *   import { getAdminAuth } from './firebase-admin'
 *   await getAdminAuth().verifyIdToken(token)
 */
export async function requireAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  // JWT tem exatamente 3 segmentos separados por ponto e tamanho razoável
  return token.split('.').length === 3 && token.length > 50
}
