'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/lib/auth'
import { useAuthContext } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const { isAuthenticated } = useAuthContext()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')

  // Redireciona se já está autenticado
  if (isAuthenticated) {
    router.push('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isSignUp) {
        await signup(email, password)
        toast.success('Conta criada com sucesso!')
        // Aguarda um pouco e redireciona
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        await login(email, password)
        toast.success('Login realizado com sucesso!')
        // Aguarda um pouco e redireciona
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    } catch (err: any) {
      let errorMessage = 'Erro ao processar solicitação'
      
      // Tratamento de erros do Firebase
      if (!isSignUp) {
        // Para login, mensagem genérica
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errorMessage = 'Usuário ou senha incorretos'
        } else {
          errorMessage = 'Usuário ou senha incorretos'
        }
      } else {
        // Para signup, mensagens específicas
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = 'Email já registrado'
        } else if (err.code === 'auth/weak-password') {
          errorMessage = 'Senha muito fraca'
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = 'Email inválido'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="email"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40 focus:border-[#D42026] transition disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40 focus:border-[#D42026] transition disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {isSignUp && (
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 6 caracteres
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full py-2.5 px-4 bg-[#D42026] hover:bg-[#A81820] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D42026] focus:ring-offset-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processando...
            </span>
          ) : isSignUp ? (
            'Criar Conta'
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
          }}
          disabled={isLoading}
          className="text-sm text-[#D42026] hover:text-[#A81820] font-medium disabled:opacity-50"
        >
          {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}
        </button>
      </div>
    </>
  )
}
