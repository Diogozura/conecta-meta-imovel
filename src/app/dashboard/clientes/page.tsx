'use client'

import { useEffect, useState } from 'react'
import { Search, Copy, Check, Webhook, Hash, Building2, CheckCircle2, AlertCircle, Phone, Plus, X, Loader2, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import PopupSignup, { type MetaSignupResult } from '@/components/PopupSignup'
import { fetchApi } from '@/lib/api-client'
import type { Project } from '@/lib/firebase-types'

// ── Types ────────────────────────────────────────────────────────────────────

interface MetaPartner {
  id: string
  name: string
  picture?: string
  created_time?: string
}

type ModalStep = 'signup' | 'success'

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0" title="Copiar">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Info row inside card ─────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 italic">Não configurado</span>
    </div>
  )
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-xs font-mono text-gray-800 truncate flex-1">{value}</span>
      <CopyButton value={value} />
    </div>
  )
}

// ── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const wabaId = project.waba?.WABA_ID ?? project.waba?.wabaId
  const phoneNumberId = project.waba?.PHONE_NUMBER_ID ?? project.waba?.phoneNumberId
  const webhookToken = project.metaConfig?.WEBHOOK_VERIFY_TOKEN
  const displayPhone = project.waba?.displayPhoneNumber
  const verifiedName = project.waba?.verifiedName
  const isLinked = !!(wabaId && phoneNumberId)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-green-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
            {verifiedName && <p className="text-xs text-gray-500 truncate">{verifiedName}</p>}
            {displayPhone && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />{displayPhone}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${isLinked ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {isLinked ? <><CheckCircle2 className="w-3 h-3" />Vinculado</> : <><AlertCircle className="w-3 h-3" />Pendente</>}
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg px-3 py-1">
        <InfoRow icon={Hash} label="WABA ID" value={wabaId} />
        <InfoRow icon={Hash} label="Phone Number ID" value={phoneNumberId} />
        <InfoRow icon={Webhook} label="Webhook Token" value={webhookToken} />
      </div>
    </div>
  )
}

// ── Meta Partners Panel ──────────────────────────────────────────────────────
function MetaPartnersPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [partners, setPartners] = useState<MetaPartner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  async function fetch() {
    setLoading(true)
    setError(null)
    setPermissionDenied(false)
    try {
      const res = await fetchApi(`/api/meta/list-partners?projectId=${projectId}`)
      const json = await res.json()
      if (json.permissionDenied) {
        setPermissionDenied(true)
        setOpen(false)
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao buscar parceiros')
      setPartners(json.partners ?? [])
      setBusinessId(json.businessId ?? null)
      setOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => (open ? setOpen(false) : partners.length > 0 ? setOpen(true) : fetch())}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Parceiros no Meta</p>
            <p className="text-xs text-gray-500">
              {permissionDenied
                ? 'Permissão insuficiente — token sem business_management'
                : partners.length > 0
                  ? `${partners.length} parceiro${partners.length !== 1 ? 's' : ''} encontrado${partners.length !== 1 ? 's' : ''}`
                  : 'Clique para buscar os parceiros vinculados no Meta Business Manager'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(partners.length > 0 || error || permissionDenied) && (
            <button
              onClick={e => { e.stopPropagation(); void fetch() }}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {loading
            ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            : open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {error ? (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Não foi possível carregar os parceiros</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
              </div>
            </div>
          ) : partners.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum parceiro encontrado neste Business Manager.</p>
          ) : (
            <div className="space-y-2">
              {businessId && (
                <p className="text-xs text-gray-400 mb-3">Business ID: <span className="font-mono">{businessId}</span></p>
              )}
              {partners.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  {p.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.picture} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">ID: {p.id}</p>
                  </div>
                  <CopyButton value={p.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Connect Meta modal ───────────────────────────────────────────────────────
function ConnectMetaModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const { currentProject } = useProject()
  const [step, setStep] = useState<ModalStep>('signup')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedData, setSavedData] = useState<MetaSignupResult | null>(null)

  function handleSuccess(data: MetaSignupResult) {
    // O callback server-side já salvou no Firestore — basta atualizar a UI
    setSavedData(data)
    setStep('success')
  }

  function handleDone() {
    onConnected() // dispara refresh da lista de projetos
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Conectar com Meta</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Indicador de projeto — sempre visível */}
          {currentProject ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              Projeto ativo:{' '}
              <span className="font-medium text-gray-900">{currentProject.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Nenhum projeto selecionado. Selecione um projeto no topo da página.
            </div>
          )}

          {/* ── Passo: sucesso ── */}
          {step === 'success' && savedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">
                    Conta conectada com sucesso!
                  </p>
                </div>
                <div className="space-y-1.5 pl-6">
                  {savedData.verifiedName && (
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Empresa:</span> {savedData.verifiedName}
                    </p>
                  )}
                  <p className="text-xs text-green-700">
                    <span className="font-medium">WABA ID:</span>{' '}
                    <span className="font-mono">{savedData.wabaId}</span>
                  </p>
                  {savedData.displayPhoneNumber && (
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Número:</span> {savedData.displayPhoneNumber}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDone}
                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Concluir
              </button>
            </div>
          )}

          {/* ── Passo: signup via popup ── */}
          {step === 'signup' && (
            <div className="space-y-4">
              {!currentProject && (
                <p className="text-xs text-gray-400 italic">
                  Selecione um projeto acima antes de prosseguir.
                </p>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {currentProject?.id && (
                <PopupSignup
                  projectId={currentProject.id}
                  onSuccess={handleSuccess}
                  onError={setErrorMsg}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentProject } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    const uid = user.uid
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [owned, collab] = await Promise.all([
          projectService.getUserProjects(uid),
          projectService.getCollaboratorProjects(uid),
        ])
        if (cancelled) return
        const merged = [...owned, ...collab.filter(c => !owned.some(o => o.id === c.id))]
        setProjects(merged.filter(p => p.waba || p.metaConfig))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user, refreshKey])

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.waba?.WABA_ID ?? p.waba?.wabaId ?? '').includes(search) ||
    (p.waba?.PHONE_NUMBER_ID ?? p.waba?.phoneNumberId ?? '').includes(search),
  )

  const isLoading = authLoading || loading

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Projetos Meta</h2>
          <p className="text-sm text-gray-500">Projetos vinculados à API do WhatsApp Business</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          Conectar com Meta
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, WABA ID ou Phone Number ID..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* Meta Partners Panel */}
      {currentProject?.id && (
        <MetaPartnersPanel projectId={currentProject.id} />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-3">
                {[1, 2, 3].map(j => <div key={j} className="h-3 bg-gray-100 rounded w-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum projeto vinculado ao Meta encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Clique em &ldquo;Conectar com Meta&rdquo; para começar</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Conectar agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ConnectMetaModal
          onClose={() => setModalOpen(false)}
          onConnected={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
