'use client'

import { auth } from './firebase'

/**
 * Wrapper de fetch que injeta automaticamente o Firebase ID Token
 * como header Authorization: Bearer <token> em todas as chamadas de API.
 */
export async function fetchApi(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken()

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}
