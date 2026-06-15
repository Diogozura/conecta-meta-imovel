'use client'

import { useState } from 'react'
import { useProject } from '@/lib/project-context'
import { useMetaConfig } from '@/lib/use-meta-config'
import projectService from '@/lib/project-service'
import { fetchApi } from '@/lib/api-client'
import { AlertCircle, Loader2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EditProjectConfigModal() {
  const { currentProject } = useProject()
  const { isConfigured } = useMetaConfig()
  const [isOpen, setIsOpen] = useState(!isConfigured)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    wabaId: currentProject?.waba?.WABA_ID || '',
    phoneNumberId: currentProject?.waba?.PHONE_NUMBER_ID || '',
    businessToken: '',
    appId: currentProject?.metaConfig?.APP_ID || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !currentProject.id) return

    setLoading(true)
    try {
      // Validação
      if (!formData.wabaId.trim()) throw new Error('WABA ID é obrigatório')
      if (!formData.phoneNumberId.trim()) throw new Error('Phone Number ID é obrigatório')
      if (!formData.appId.trim()) throw new Error('App ID é obrigatório')

      // Atualizar dados públicos do projeto
      await projectService.updateProject(currentProject.id, {
        metaConfig: {
          APP_ID: formData.appId.trim(),
          GRAPH_API_VERSION: currentProject.metaConfig?.GRAPH_API_VERSION || 'v21.0',
          EMBEDDED_SIGNUP_CONFIG_ID: currentProject.metaConfig?.EMBEDDED_SIGNUP_CONFIG_ID || '',
          WEBHOOK_VERIFY_TOKEN: currentProject.metaConfig?.WEBHOOK_VERIFY_TOKEN || '',
        },
        waba: {
          WABA_ID: formData.wabaId.trim(),
          PHONE_NUMBER_ID: formData.phoneNumberId.trim(),
        }
      })

      // Salvar token em project_secrets via server-side
      if (formData.businessToken.trim()) {
        const saveRes = await fetchApi('/api/meta/save-waba-credentials', {
          method: 'POST',
          body: JSON.stringify({
            projectId: currentProject.id,
            wabaId: formData.wabaId.trim(),
            phoneNumberId: formData.phoneNumberId.trim(),
            displayPhoneNumber: currentProject.waba?.displayPhoneNumber || '',
            verifiedName: currentProject.waba?.verifiedName || '',
            businessToken: formData.businessToken.trim(),
          }),
        })

        if (!saveRes.ok) {
          let reason = 'configure as variáveis FIREBASE_ADMIN_* no .env.local'
          try {
            const json = await saveRes.json()
            if (json.error) reason = json.error
          } catch { /* resposta era HTML */ }
          console.warn('[EditProject] Token não salvo no servidor:', reason)
          toast.warning(`Projeto atualizado! Token pendente: ${reason}`)
          setIsOpen(false)
          window.location.reload()
          return
        }
      }

      toast.success('Projeto atualizado com sucesso!')
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar')
    } finally {
      setLoading(false)
    }
  }

  if (!currentProject) return null

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
        title="Editar configuração do projeto"
      >
        <Edit2 className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h2 className="text-xl font-bold">Editar Configuração do Projeto</h2>
          <p className="text-blue-100 text-sm mt-1">Projeto: {currentProject.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Preencha os dados para ativar este projeto
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App ID *
            </label>
            <input
              type="text"
              name="appId"
              value={formData.appId}
              onChange={handleChange}
              placeholder="Seu App ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WABA ID *
            </label>
            <input
              type="text"
              name="wabaId"
              value={formData.wabaId}
              onChange={handleChange}
              placeholder="WhatsApp Business Account ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number ID *
            </label>
            <input
              type="text"
              name="phoneNumberId"
              value={formData.phoneNumberId}
              onChange={handleChange}
              placeholder="ID do número registrado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Token (deixe em branco para manter o atual)
            </label>
            <input
              type="password"
              name="businessToken"
              value={formData.businessToken}
              onChange={handleChange}
              placeholder="EAA... (token de acesso)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
