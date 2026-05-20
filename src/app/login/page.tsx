import type { Metadata } from 'next'
import { login } from '@/lib/auth'
import Image from 'next/image'

export const metadata: Metadata = {
  title: "Entrar | Scale Estratégia Digital",
  description:
    "Acesse a plataforma de comunicação via WhatsApp Business API da Scale Estratégia Digital para enviar mensagens, gerenciar clientes e automatizar seu atendimento.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111111] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D42026]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#D42026]/10 blur-3xl" />

        <div className="relative max-w-md z-10">
          {/* Logo */}
          <div className="mb-10">
            <Image
              src="/Logos PNG/Logo-06.png"
              alt="scale Estratégia Digital"
              width={260}
              height={100}
              className="brightness-0 invert"
            />
          </div>

          <p className="text-gray-400 text-lg leading-relaxed mb-10">
            Plataforma de comunicação via WhatsApp Business API. Envie mensagens, gerencie clientes e automatize seu atendimento.
          </p>

          <div className="space-y-3">
            {[
              'Envio de mensagens em massa',
              'Templates personalizados',
              'Cadastro e gestão de clientes',
              'Múltiplos números conectados',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-5 h-5 bg-[#D42026] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <Image
              src="/Logos PNG/Logo-06.png"
              alt="scale Estratégia Digital"
              width={180}
              height={70}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#1a1a1a]">Bem-vindo!</h2>
              <p className="text-sm text-gray-500 mt-1">Entre com suas credenciais para continuar</p>
            </div>

            <form action={login} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40 focus:border-[#D42026] transition"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40 focus:border-[#D42026] transition"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#D42026] hover:bg-[#A81820] text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D42026] focus:ring-offset-2"
              >
                Entrar
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            scale Estratégia Digital © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
