import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from '@/components/LoginForm'

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

            <LoginForm />
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            scale Estratégia Digital © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
