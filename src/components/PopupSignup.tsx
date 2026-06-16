'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

// ── Public contract ───────────────────────────────────────────────────────────

export interface MetaSignupResult {
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  verifiedName: string
}

interface PopupSignupProps {
  /** ID do projeto Jade Hub ao qual a WABA será vinculada. */
  projectId: string
  onSuccess?: (data: MetaSignupResult) => void
  onError?: (message: string) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POPUP_W = 600
const POPUP_H = 700
const META_OAUTH_VERSION = 'v25.0'

// ── Component ─────────────────────────────────────────────────────────────────

export default function PopupSignup({ projectId, onSuccess, onError }: PopupSignupProps) {
  const [waiting, setWaiting] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resolvedRef = useRef(false) // evita chamar onSuccess após manual close

  function clearPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function buildOAuthUrl(): string {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''
    const redirectUri = `${window.location.origin}/api/auth/callback/meta`

    // state transporta o projectId de volta ao callback server-side
    const state = btoa(JSON.stringify({ projectId, t: Date.now() }))

    // extras força a abertura direta do Onboarding do WhatsApp Business
    const extras = JSON.stringify({
      setup: {},
      sessionInfoVersion: 3,
      featureType: 'whatsapp_embedded_signup',
    })

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'public_profile,whatsapp_business_management,whatsapp_business_messaging',
      extras,
      state,
    })

    return `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${params.toString()}`
  }

  function handleOpen() {
    const left = Math.round((window.screen.width - POPUP_W) / 2)
    const top = Math.round((window.screen.height - POPUP_H) / 2)

    const popup = window.open(
      buildOAuthUrl(),
      'meta_embedded_signup',
      [
        `width=${POPUP_W}`,
        `height=${POPUP_H}`,
        `left=${left}`,
        `top=${top}`,
        'scrollbars=yes',
        'resizable=yes',
        'toolbar=no',
        'menubar=no',
        'location=yes',
      ].join(','),
    )

    if (!popup) {
      onError?.(
        'Popup bloqueado pelo navegador. Permita popups para este site nas configurações do navegador e tente novamente.',
      )
      return
    }

    resolvedRef.current = false
    popupRef.current = popup
    setWaiting(true)

    // Detecta fechamento manual sem conclusão do fluxo
    pollRef.current = setInterval(() => {
      if (popup.closed) {
        clearPoll()
        if (!resolvedRef.current) setWaiting(false)
      }
    }, 600)
  }

  // Listener do postMessage enviado pelo callback server-side
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Aceita apenas mensagens da nossa própria origem
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'META_SIGNUP_RESULT') return

      resolvedRef.current = true
      clearPoll()
      popupRef.current?.close()
      popupRef.current = null
      setWaiting(false)

      if (event.data.status === 'success') {
        onSuccess?.(event.data.data as MetaSignupResult)
      } else {
        onError?.(event.data.message ?? 'Erro ao conectar com a Meta. Tente novamente.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearPoll()
    }
  }, [onSuccess, onError])

  return (
    <div className="space-y-4">
      {/* Botão principal */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={waiting}
        className="inline-flex items-center gap-3 px-5 py-3 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow"
      >
        {waiting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Aguardando autorização…
          </>
        ) : (
          <>
            {/* Facebook icon */}
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Conectar com WhatsApp Business
            <ExternalLink className="w-4 h-4 opacity-70" />
          </>
        )}
      </button>

      {/* Instrução exibida enquanto o popup está aberto */}
      {waiting && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Uma janela do Facebook foi aberta. Conclua o onboarding do WhatsApp Business e
            volte aqui. <span className="font-medium">Não feche esta janela principal.</span>
          </p>
        </div>
      )}

      {/* Instrução de Coexistência — visível antes de iniciar */}
      {!waiting && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold mb-1">Modo de Coexistência (CoEx)</p>
          <p>
            Na janela que será aberta, escolha{' '}
            <strong>&ldquo;Conectar um aplicativo WhatsApp Business existente&rdquo;</strong>{' '}
            e escaneie o QR Code com o <strong>WhatsApp Business</strong> do seu celular.
            O número continuará funcionando normalmente enquanto as mensagens são espelhadas
            na plataforma.
          </p>
        </div>
      )}
    </div>
  )
}
