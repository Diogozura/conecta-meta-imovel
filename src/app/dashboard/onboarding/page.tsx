'use client'

import { useState } from 'react'
import { useProject } from '@/lib/project-context'
import EmbeddedSignup from '@/components/EmbeddedSignup'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api-client'

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export default function OnboardingPage() {
  const { currentProject } = useProject()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedData, setSavedData] = useState<{ wabaId: string; displayPhone: string } | null>(null)

  async function handleSuccess(data: {
    wabaId: string
    phoneNumberId: string
    accessToken: string
  }) {
    if (!currentProject?.id) {
      setErrorMsg('Nenhum projeto ativo. Crie um projeto antes de conectar uma conta WABA.')
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setErrorMsg('')

    try {
      // Busca nome e número formatado na API do Meta — só se tiver phoneNumberId (CoEx pode não ter)
      let displayPhoneNumber = ''
      let verifiedName = ''
      if (data.phoneNumberId) {
        try {
          const phoneRes = await fetch(
            `https://graph.facebook.com/${process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION}/${data.phoneNumberId}` +
            `?fields=display_phone_number,verified_name&access_token=${data.accessToken}`
          )
          const phoneData = await phoneRes.json()
          if (phoneRes.ok) {
            displayPhoneNumber = phoneData.display_phone_number ?? ''
            verifiedName = phoneData.verified_name ?? ''
          } else {
            console.warn('[onboarding] Não foi possível buscar dados do número:', phoneData)
          }
        } catch (phoneErr) {
          console.warn('[onboarding] Falha ao buscar dados do número (não crítico):', phoneErr)
        }
      }

      // Persiste as credenciais no Firestore via Admin SDK (server-side)
      const res = await fetchApi('/api/meta/save-waba-credentials', {
        method: 'POST',
        body: JSON.stringify({
          projectId: currentProject.id,
          wabaId: data.wabaId,
          phoneNumberId: data.phoneNumberId,
          displayPhoneNumber,
          verifiedName,
          businessToken: data.accessToken,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Erro ao salvar credenciais')
      }

      setSavedData({ wabaId: data.wabaId, displayPhone: displayPhoneNumber || data.phoneNumberId })
      setSaveStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setSaveStatus('error')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Conectar conta WhatsApp Business</h2>
        <p className="text-sm text-gray-500 mt-1">
          Use o Embedded Signup do Meta para autorizar sua conta WhatsApp Business e obter acesso à Cloud API.
        </p>
      </div>

      {!currentProject && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Nenhum projeto ativo. Crie um projeto primeiro antes de conectar uma conta WABA.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">Antes de começar</p>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Seu app Meta deve ter o WhatsApp use case habilitado</li>
          <li>O negócio no Meta deve estar verificado</li>
          <li>As credenciais serão salvas automaticamente no projeto <strong>{currentProject?.name ?? '—'}</strong></li>
        </ul>
      </div>

      {saveStatus === 'success' && savedData ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Conta conectada com sucesso!</h3>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p><span className="font-medium">WABA ID:</span> {savedData.wabaId}</p>
            <p><span className="font-medium">Número:</span> {savedData.displayPhone}</p>
            <p><span className="font-medium">Projeto:</span> {currentProject?.name}</p>
          </div>
          <p className="text-xs text-green-600">
            As credenciais foram salvas com segurança. Você já pode enviar mensagens e templates.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">1</div>
            <h3 className="font-semibold text-gray-800">Autenticar com Meta</h3>
          </div>
          <p className="text-sm text-gray-600">
            Clique no botão abaixo. Uma janela do Facebook será aberta para você autorizar o acesso ao seu
            WhatsApp Business Account (WABA). Ao finalizar, as credenciais são salvas automaticamente.
          </p>

          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando credenciais no projeto...
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <EmbeddedSignup onSuccess={handleSuccess} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">2</div>
          <h3 className="font-semibold text-gray-800">Configurar Webhook no Meta App Dashboard</h3>
        </div>
        <p className="text-sm text-gray-600">
          No App Dashboard, vá em <strong>WhatsApp → Configuration</strong> e configure:
        </p>
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 break-all">
            <span className="text-gray-500">Callback URL: </span>https://seu-dominio.com/api/webhook
          </div>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700">
            <span className="text-gray-500">Verify Token: </span>
            <span className="text-orange-600">{'{META_WEBHOOK_VERIFY_TOKEN do .env.local}'}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Inscreva-se nos campos: <code>messages</code>, <code>message_template_status_update</code>
        </p>
      </div>
    </div>
  )
}
