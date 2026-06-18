'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Plus, AlertCircle, Loader2,
  Phone, Building2, X, CheckCircle2, KeyRound, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthContext } from '@/lib/auth-context'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import { fetchApi } from '@/lib/api-client'
import type { Project } from '@/lib/firebase-types'

// ─── ProjectCard ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isActive,
  onSelect,
  onDelete,
}: {
  project: Project
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const hasWaba = !!(project.waba?.wabaId || project.waba?.WABA_ID)
  const wabaId = project.waba?.wabaId || project.waba?.WABA_ID || ''
  const phoneNumberId = project.waba?.phoneNumberId || project.waba?.PHONE_NUMBER_ID || ''
  const phoneNumber = project.waba?.displayPhoneNumber || phoneNumberId || '—'
  const verifiedName = project.waba?.verifiedName || '—'

  const [showTokenForm, setShowTokenForm] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [updatingToken, setUpdatingToken] = useState(false)

  async function handleUpdateToken(e: React.FormEvent) {
    e.preventDefault()
    if (!newToken.trim() || !project.id) return
    setUpdatingToken(true)
    try {
      const res = await fetchApi('/api/meta/save-waba-credentials', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          wabaId,
          phoneNumberId,
          displayPhoneNumber: project.waba?.displayPhoneNumber ?? '',
          verifiedName: project.waba?.verifiedName ?? '',
          businessToken: newToken.trim(),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Erro ao salvar token')
      }
      toast.success('System User Token atualizado!')
      setShowTokenForm(false)
      setNewToken('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar token')
    } finally {
      setUpdatingToken(false)
    }
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isActive ? 'border-[#D42026] bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
              isActive ? 'bg-[#D42026] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
              {project.description && (
                <p className="text-xs text-gray-500 truncate">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {hasWaba ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium border border-green-100">
                <CheckCircle2 className="w-3 h-3" />
                WhatsApp conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-medium border border-gray-200">
                Sem WhatsApp
              </span>
            )}
            {!isActive && (
              <button
                onClick={onSelect}
                className="px-2.5 py-1 text-[11px] font-medium text-[#D42026] border border-[#D42026]/30 rounded-lg hover:bg-red-50 transition-colors"
              >
                Usar
              </button>
            )}
            {isActive && (
              <span className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#D42026] rounded-lg">
                Ativo
              </span>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title="Deletar projeto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {hasWaba && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{phoneNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{verifiedName}</span>
              </div>
            </div>
            <button
              onClick={() => setShowTokenForm(v => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
              title="Atualizar System User Token"
            >
              <KeyRound className="w-3 h-3" />
              Atualizar Token
            </button>
          </div>
        )}
      </div>

      {showTokenForm && hasWaba && (
        <form
          onSubmit={handleUpdateToken}
          className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2"
        >
          <p className="text-[11px] text-gray-500">
            Cole um <strong>System User Access Token</strong> com o escopo{' '}
            <code className="bg-gray-100 px-1 rounded">whatsapp_business_messaging</code>{' '}
            para habilitar o envio de mensagens.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              placeholder="EAAB... (System User Token)"
              required
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#D42026]/40"
            />
            <button
              type="button"
              onClick={() => { setShowTokenForm(false); setNewToken('') }}
              className="px-2 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={updatingToken || !newToken.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] disabled:opacity-50 transition-colors"
            >
              {updatingToken && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const { userData } = useAuthContext()
  const { currentProject, setCurrentProject } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    if (!userData?.id) return
    void loadProjects()
  }, [userData?.id])

  async function loadProjects() {
    setLoading(true)
    try {
      const [owned, collab] = await Promise.all([
        projectService.getUserProjects(userData!.id!),
        projectService.getCollaboratorProjects(userData!.id!),
      ])
      const merged = [...owned]
      for (const p of collab) {
        if (!merged.some(m => m.id === p.id)) merged.push(p)
      }
      setProjects(merged)
    } catch {
      toast.error('Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !userData?.id) return
    setCreating(true)
    try {
      await projectService.createProject({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        owner: userData.id,
        wabaId: '',
        collaborators: [],
        status: 'active',
      } as Parameters<typeof projectService.createProject>[0])

      toast.success(`Projeto "${newName.trim()}" criado! Conecte o WhatsApp em Clientes.`)
      setNewName('')
      setNewDescription('')
      setShowForm(false)
      await loadProjects()
    } catch {
      toast.error('Erro ao criar projeto')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!project.id) return
    const confirmed = window.confirm(`Deletar o projeto "${project.name}"? Esta ação não pode ser desfeita.`)
    if (!confirmed) return
    try {
      const res = await fetchApi(`/api/projects/delete?projectId=${project.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Erro ao deletar')
      }
      toast.success(`Projeto "${project.name}" deletado.`)
      if (currentProject?.id === project.id) setCurrentProject(null as unknown as Project)
      await loadProjects()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar projeto')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500">Gerencie os projetos vinculados à sua conta.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">Projetos</h3>
            {!loading && (
              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                {projects.length}
              </span>
            )}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo projeto
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreateProject} className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nome <span className="text-[#D42026]">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Imobiliária Silva"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <AlertCircle className="w-3 h-3" />
                Após criar, conecte o WhatsApp em <strong>Clientes</strong>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setNewName(''); setNewDescription('') }}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] disabled:opacity-50 transition-colors"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? 'Criando…' : 'Criar projeto'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="p-4 space-y-3">
          {loading && (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Carregando projetos…</p>
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">Nenhum projeto ainda</p>
              <p className="text-xs text-gray-400">Clique em &quot;Novo projeto&quot; para começar.</p>
            </div>
          )}

          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              isActive={currentProject?.id === p.id}
              onSelect={() => setCurrentProject(p)}
              onDelete={() => handleDeleteProject(p)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
