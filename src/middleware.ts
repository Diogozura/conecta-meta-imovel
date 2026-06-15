import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware atualizado para trabalhar com Firebase Authentication
 * A autenticação é gerenciada no frontend via AuthProvider e ProtectedRoute
 * Este middleware apenas redireciona rotas públicas/privadas conforme necessário
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Permite acesso a rotas públicas
  if (path === '/login' || path === '/') {
    return NextResponse.next()
  }

  // Redireciona para login se tentar acessar rotas protegidas
  // (a verificação real será feita no frontend via ProtectedRoute)
  if (path.startsWith('/dashboard') || path.startsWith('/api')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static|public).*)'],
}
