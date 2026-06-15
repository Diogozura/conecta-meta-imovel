'use client'

import { useState } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchApi } from '@/lib/api-client'

export default function CreateProjectForm() {
  const { user } = useAuthContext()
  const { setCurrentProject } = useProject()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    projectName: '',
    wabaId: '',
    phoneNumberId: '',
    businessToken: '',
    appId: '',
    graphApiVersion: 'v21.0',
    embeddedSignupConfigId: '',
    webhookVerifyToken: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!user) {
      setError('Usuário não autenticado')
      setLoading(false)
      return
    }

    try {
      if (!formData.projectName.trim()) throw new Error('Nome do projeto é obrigatório')
      if (!formData.wabaId.trim()) throw new Error('WABA ID é obrigatório')
      if (!formData.phoneNumberId.trim()) throw new Error('Phone Number ID é obrigatório')
      if (!formData.businessToken.trim()) throw new Error('Business Token é obrigatório')
      if (!formData.appId.trim()) throw new Error('App ID é obrigatório')

      // 1. Cria o projeto SEM o token (dados públicos)
      const projectId = await projectService.createProject({
        name: formData.projectName.trim(),
        description: 'Projeto criado manualmente',
        owner: user.uid,
        wabaId: formData.wabaId.trim(),
        collaborators: [user.uid],
        status: 'active',
        metaConfig: {
          APP_ID: formData.appId.trim(),
          GRAPH_API_VERSION: formData.graphApiVersion,
          EMBEDDED_SIGNUP_CONFIG_ID: formData.embeddedSignupConfigId.trim() || '',
          WEBHOOK_VERIFY_TOKEN: formData.webhookVerifyToken.trim() || '',
        },
        waba: {
          WABA_ID: formData.wabaId.trim(),
          PHONE_NUMBER_ID: formData.phoneNumberId.trim(),
          // BUSINESS_TOKEN não vai aqui — vai para project_secrets via API
        },
      })

      // 2. Salva o token em project_secrets + cria o índice de roteamento do webhook
      const saveRes = await fetchApi('/api/meta/save-waba-credentials', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          wabaId: formData.wabaId.trim(),
          phoneNumberId: formData.phoneNumberId.trim(),
          displayPhoneNumber: '',
          verifiedName: '',
          businessToken: formData.businessToken.trim(),
        }),
      })

      if (!saveRes.ok) {
        // Não tenta parseJSON — resposta pode ser HTML se o Admin SDK não estiver configurado
        let reason = 'configure as variáveis FIREBASE_ADMIN_* no .env.local'
        try {
          const json = await saveRes.json()
          if (json.error) reason = json.error
        } catch { /* resposta era HTML */ }
        console.warn('[CreateProject] Token não salvo no servidor:', reason)
        toast.warning(`Projeto criado! Token pendente: ${reason}`)
      }

      // 3. Ativa o projeto recém-criado no contexto
      const newProject = await projectService.getProject(projectId)
      if (newProject) setCurrentProject(newProject)

      toast.success('Projeto criado com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar projeto'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-3">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Não Autenticado</h3>
            <p className="text-sm text-amber-800 mt-1">Por favor, faça login para criar um projeto.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Criar Primeiro Projeto</h2>
        <p className="text-blue-700 mb-6">
          Configure os dados do seu projeto Meta WhatsApp para começar a usar o sistema.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Projeto *</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              placeholder="Ex: JADE HUB"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App ID *</label>
              <input
                type="text"
                name="appId"
                value={formData.appId}
                onChange={handleChange}
                placeholder="Seu App ID"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Graph API Version</label>
              <input
                type="text"
                name="graphApiVersion"
                value={formData.graphApiVersion}
                onChange={handleChange}
                placeholder="v21.0"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WABA ID *</label>
              <input
                type="text"
                name="wabaId"
                value={formData.wabaId}
                onChange={handleChange}
                placeholder="WhatsApp Business Account ID"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number ID *</label>
              <input
                type="text"
                name="phoneNumberId"
                value={formData.phoneNumberId}
                onChange={handleChange}
                placeholder="Ex: 1192131313973212"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Token *</label>
            <input
              type="password"
              name="businessToken"
              value={formData.businessToken}
              onChange={handleChange}
              placeholder="EAA... (token de acesso)"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Armazenado com segurança em servidor — nunca exposto ao navegador
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Embedded Signup Config ID (opcional)
              </label>
              <input
                type="text"
                name="embeddedSignupConfigId"
                value={formData.embeddedSignupConfigId}
                onChange={handleChange}
                placeholder="Configuration ID"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Verify Token (opcional)
              </label>
              <input
                type="text"
                name="webhookVerifyToken"
                value={formData.webhookVerifyToken}
                onChange={handleChange}
                placeholder="Token para validação"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? 'Criando Projeto...' : 'Criar Projeto'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Todos os dados são armazenados com segurança no Firebase
          </p>
        </form>
      </div>
    </div>
  )
}
