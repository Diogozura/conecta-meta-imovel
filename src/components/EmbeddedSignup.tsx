'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api-client'

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: {
      init: (config: object) => void
      login: (
        callback: (response: { authResponse?: { code?: string }; status: string }) => void,
        options: object,
      ) => void
    }
  }
}

type StepStatus = 'idle' | 'loading' | 'done' | 'error'

interface OnboardingStep {
  label: string
  status: StepStatus
  detail?: string
}

interface EmbeddedSignupProps {
  onSuccess?: (data: { wabaId: string; phoneNumberId: string; accessToken: string }) => void
}

export default function EmbeddedSignup({ onSuccess }: EmbeddedSignupProps) {
  const [sdkReady, setSdkReady] = useState(false)
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { label: 'Autenticação via Facebook', status: 'idle' },
    { label: 'Troca de token de acesso', status: 'idle' },
    { label: 'Leitura das credenciais da WABA', status: 'idle' },
    { label: 'Inscrição em webhooks', status: 'idle' },
  ])

  const wabaIdRef = useRef<string>('')
  const phoneNumberIdRef = useRef<string>('')

  function setStep(index: number, patch: Partial<OnboardingStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  // Carrega o Facebook JS SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? 'v21.0',
      })
      setSdkReady(true)
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  // Listener para o evento FINISH do Embedded Signup (captura WABA + phone IDs)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Aceita qualquer subdomínio do facebook.com (www, web, business, staticxx…)
      try {
        const { hostname } = new URL(event.origin)
        if (!hostname.endsWith('facebook.com')) return
      } catch {
        return
      }
      try {
        const data = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[EmbeddedSignup] postMessage recebido:', JSON.stringify(data))
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            wabaIdRef.current = data.data?.waba_id ?? ''
            phoneNumberIdRef.current = data.data?.phone_number_id ?? ''
          }
        }
      } catch {
        // ignora payloads não-JSON
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function handleLaunchSignup() {
    if (!window.FB) return

    setSteps([
      { label: 'Autenticação via Facebook', status: 'loading' },
      { label: 'Troca de token de acesso', status: 'idle' },
      { label: 'Leitura das credenciais da WABA', status: 'idle' },
      { label: 'Inscrição em webhooks', status: 'idle' },
    ])

    window.FB.login(
      (response) => {
        void (async () => {
          const code = response.authResponse?.code

          if (!code) {
            setStep(0, { status: 'error', detail: 'Autenticação cancelada ou negada.' })
            return
          }
          setStep(0, { status: 'done', detail: 'Autenticado com sucesso.' })

          // Passo 1: trocar código por token
          setStep(1, { status: 'loading' })
          let accessToken: string
          try {
            const res = await fetchApi('/api/meta/exchange-token', {
              method: 'POST',
              body: JSON.stringify({ code }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            accessToken = json.access_token
            setStep(1, { status: 'done', detail: 'Token de negócio obtido.' })
          } catch (err) {
            setStep(1, { status: 'error', detail: String(err) })
            return
          }

          // Passo 2 (CoEx): resolver WABA + phone IDs — sem chamada /register.
          // No modelo de Coexistência, o número já está ativo via QR Code do celular.
          // Chamar POST /register manual derrubaria o app WhatsApp Business do cliente.
          setStep(2, { status: 'loading' })
          let phoneNumberId = phoneNumberIdRef.current
          let wabaId = wabaIdRef.current
          const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? 'v21.0'

          // Fallback A: extrai waba_id via debug_token (granular_scopes) se o evento FINISH não trouxe
          if (!wabaId) {
            try {
              const debugRes = await fetchApi('/api/meta/debug-token', {
                method: 'POST',
                body: JSON.stringify({ accessToken }),
              })
              const debugData = await debugRes.json()
              const scopes: Array<{ scope: string; target_ids?: string[] }> =
                debugData?.data?.granular_scopes ?? []
              const ids = scopes.find(s => s.scope === 'whatsapp_business_management')?.target_ids ?? []
              if (ids.length > 0) { wabaId = ids[0]; wabaIdRef.current = wabaId }
            } catch { /* fallback B abaixo */ }
          }

          // Fallback B: lista WABAs vinculadas ao token do cliente
          if (!wabaId) {
            try {
              const r = await fetch(
                `https://graph.facebook.com/${graphVersion}/me/whatsapp_business_accounts?access_token=${accessToken}`
              )
              const d = await r.json()
              if (r.ok && d.data?.[0]?.id) { wabaId = d.data[0].id; wabaIdRef.current = wabaId }
            } catch { /* ignora */ }
          }

          // Fallback C: busca phone_number_id dentro da conta WhatsApp Business
          if (!phoneNumberId && wabaId) {
            try {
              const r = await fetch(
                `https://graph.facebook.com/${graphVersion}/${wabaId}/phone_numbers?access_token=${accessToken}`
              )
              const d = await r.json()
              if (r.ok && d.data?.[0]?.id) {
                phoneNumberId = d.data[0].id
                phoneNumberIdRef.current = phoneNumberId
              }
            } catch { /* ignora */ }
          }

          if (!wabaId) {
            setStep(2, {
              status: 'error',
              detail:
                'WABA não encontrada. Certifique-se de escanear o QR Code durante o ' +
                'pop-up da Meta e aguardar a confirmação antes de fechar.',
            })
            return
          }

          setStep(2, {
            status: 'done',
            detail: `WABA: ${wabaId}${phoneNumberId ? ` · Telefone ID: ${phoneNumberId}` : ''}`,
          })

          // Passo 3 (CoEx): webhook configurado globalmente no App Dashboard da Meta.
          // Não chamamos /subscribed_apps por cliente — a Meta bloqueia esse endpoint
          // para contas compartilhadas de Solution Providers sem permissão administrativa.
          setStep(3, { status: 'done', detail: 'Configuração de webhook gerenciada pelo sistema.' })

          onSuccess?.({ wabaId, phoneNumberId, accessToken })
        })()
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: 3,
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleLaunchSignup}
        disabled={!sdkReady}
        className="inline-flex items-center gap-3 px-5 py-3 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors shadow"
      >
        {/* Facebook icon */}
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
        Conectar com Facebook / WhatsApp Business
      </button>

      {/* Instrução de Coexistência — exibida antes e durante o fluxo */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold mb-1">Atenção — Modo de Coexistência (CoEx)</p>
        <p>
          Durante o pop-up da Meta, escolha a opção{' '}
          <strong>&ldquo;Conectar um aplicativo WhatsApp Business existente&rdquo;</strong>{' '}
          e escaneie o QR Code com o aplicativo <strong>WhatsApp Business</strong> do
          seu celular. O número continuará funcionando normalmente no celular enquanto
          as mensagens são espelhadas na plataforma em tempo real.
        </p>
      </div>

      {steps.some((s) => s.status !== 'idle') && (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {step.status === 'loading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {step.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {step.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                {step.status === 'idle' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${step.status === 'error' ? 'text-red-700' : 'text-gray-800'}`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className={`text-xs mt-0.5 ${step.status === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
