'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  collection, query, where, onSnapshot, limit,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import {
  MessageSquare, Search, Send, Loader2, AlertCircle, Plus, X,
  ArrowRightLeft, MoreVertical, Paperclip, Smile,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProject } from '@/lib/project-context'
import EditProjectConfigModal from '@/components/EditProjectConfigModal'
import { fetchApi } from '@/lib/api-client'
import type { Conversation } from '@/lib/firebase-types'

type FsTimestamp = { toDate: () => Date; seconds: number }

type FsMessage = {
  id: string
  conversationId: string
  projectId: string
  senderId: string
  senderType: 'user' | 'client'
  content: string
  timestamp: FsTimestamp | null
  deliveryStatus: string
  read: boolean
}

type PendingConv = { phoneNumber: string; name: string }

const FILTER_TABS = ['Todas', 'Minhas', 'Não lidas', 'Sem resp.', 'IA off'] as const
const CHANNEL_TABS = ['Todos', 'WhatsApp', 'Instagram', 'QR Code'] as const

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const AVATAR_COLORS = [
  'bg-red-100 text-[#D42026]',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]

function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatTime(ts: FsTimestamp | null | undefined): string {
  if (!ts) return ''
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds * 1000)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatConvTime(raw: unknown): string {
  if (!raw) return ''
  const ts = raw as FsTimestamp
  return formatTime(ts)
}

function noApiToast() {
  toast.info('puts, por enquanto sem API para essa funcionalidade 😅')
}

export default function ConversasPage() {
  return (
    <Suspense>
      <ConversasInner />
    </Suspense>
  )
}

function ConversasInner() {
  const { currentProject, conversations, conversationsLoading } = useProject()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingConv, setPendingConv] = useState<PendingConv | null>(null)
  const [messages, setMessages] = useState<FsMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [sendError, setSendError] = useState('')
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [activeFilterTab, setActiveFilterTab] = useState<(typeof FILTER_TABS)[number]>('Todas')
  const [activeChannel, setActiveChannel] = useState<(typeof CHANNEL_TABS)[number]>('Todos')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const searchParams = useSearchParams()

  const selectedConv: Conversation | null = conversations.find(c => c.id === selectedId) ?? null
  const activeTo = selectedConv?.phoneNumber ?? pendingConv?.phoneNumber ?? null
  const activeDisplayName = selectedConv?.clientName ?? pendingConv?.name ?? activeTo ?? ''

  // Subscribe to messages of the selected conversation
  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    if (!selectedId) { setMessages([]); return }

    setMessagesLoading(true)
    const q = query(
      collection(firestore, 'messages'),
      where('conversationId', '==', selectedId),
      limit(100),
    )

    unsubRef.current = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as FsMessage)
      msgs.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
      setMessages(msgs)
      setMessagesLoading(false)
    }, () => { setMessagesLoading(false) })

    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } }
  }, [selectedId])

  // When a pending conv's first message gets saved, switch to the real conversation
  useEffect(() => {
    if (!pendingConv) return
    const conv = conversations.find(
      c => c.phoneNumber?.replace(/\D/g, '') === pendingConv.phoneNumber.replace(/\D/g, '')
    )
    if (conv?.id) {
      setSelectedId(conv.id)
      setPendingConv(null)
    }
  }, [conversations, pendingConv])

  // Auto-select from ?from= URL param
  useEffect(() => {
    const from = searchParams.get('from')
    if (!from) return
    const conv = conversations.find(c => c.phoneNumber?.replace(/\D/g, '') === from.replace(/\D/g, ''))
    if (conv?.id) setSelectedId(conv.id)
  }, [searchParams, conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sortedConversations = [...conversations].sort((a, b) => {
    const ta = (a.lastMessageTime as unknown as FsTimestamp)?.seconds ?? 0
    const tb = (b.lastMessageTime as unknown as FsTimestamp)?.seconds ?? 0
    return tb - ta
  })

  const filtered = sortedConversations.filter(c => {
    const name = c.clientName ?? c.phoneNumber ?? ''
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phoneNumber ?? '').includes(search.replace(/\D/g, ''))
    const matchFilter =
      activeFilterTab === 'Todas' ||
      (activeFilterTab === 'Não lidas' && (c.unreadCount ?? 0) > 0)
    return matchSearch && matchFilter
  })

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !activeTo || !currentProject?.id) return

    const msgText = message.trim()
    setMessage('')
    setSendStatus('loading')
    setSendError('')

    try {
      const res = await fetchApi('/api/meta/send-message', {
        method: 'POST',
        body: JSON.stringify({
          to: activeTo.replace(/\D/g, ''),
          message: msgText,
          projectId: currentProject.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar')
      setSendStatus('idle')
    } catch (err) {
      setSendStatus('error')
      setSendError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  function handleStartNewConv(e: React.FormEvent) {
    e.preventDefault()
    if (!newNumber.trim()) return
    setSelectedId(null)
    setPendingConv({
      phoneNumber: newNumber.replace(/\D/g, ''),
      name: newName.trim() || newNumber.trim(),
    })
    setShowNewForm(false)
    setNewNumber('')
    setNewName('')
  }

  function handleSelectConv(id: string) {
    setSelectedId(id)
    setPendingConv(null)
    setSendError('')
  }

  const isActive = selectedConv !== null || pendingConv !== null

  return (
    <div className="flex h-[calc(100vh-7rem)] -mx-6 -my-6">
      {/* LEFT PANEL */}
      <div className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
            <button
              onClick={() => setShowNewForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition-colors"
            >
              {showNewForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              Nova
            </button>
          </div>

          {showNewForm && (
            <form onSubmit={handleStartNewConv} className="space-y-2 mb-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome (opcional)"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D42026]/50"
              />
              <input
                type="text"
                value={newNumber}
                onChange={e => setNewNumber(e.target.value)}
                placeholder="Número (Ex: 5511999990000)"
                required
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D42026]/50"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition-colors"
              >
                Iniciar conversa
              </button>
            </form>
          )}

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa, contato ou telefone"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D42026]/50"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar mb-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilterTab(tab)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeFilterTab === tab
                    ? 'bg-[#D42026] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {CHANNEL_TABS.map(ch => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  activeChannel === ch
                    ? 'border-[#D42026] text-[#D42026] bg-red-50'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {conversationsLoading && (
            <div className="py-8 text-center text-xs text-gray-400">
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin opacity-40" />
              Carregando...
            </div>
          )}

          {!conversationsLoading && currentProject && filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma conversa encontrada.
            </div>
          )}

          {!currentProject && !conversationsLoading && (
            <div className="py-12 text-center text-gray-400 text-xs px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Selecione um projeto para ver as conversas.
            </div>
          )}

          {filtered.map(c => {
            const name = c.clientName || c.phoneNumber || '—'
            const color = avatarColor(name)
            const isSelected = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => handleSelectConv(c.id!)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? 'bg-red-50 border-l-2 border-[#D42026]'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${color}`}>
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                      {formatConvTime(c.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mb-1">{c.phoneNumber} · WhatsApp</p>
                  <p className="text-[11px] text-gray-500 truncate mb-1.5">{c.lastMessage || 'Nenhuma mensagem'}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      WhatsApp
                    </span>
                    {(c.unreadCount ?? 0) > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#D42026] shrink-0 ml-auto" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden">
        {isActive ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarColor(activeDisplayName)}`}>
                {getInitials(activeDisplayName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{activeDisplayName}</p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    WhatsApp
                  </span>
                  {currentProject && (
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                      {currentProject.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{activeTo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={noApiToast}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D42026] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition-colors"
                >
                  Transferir
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={noApiToast}
                  className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messagesLoading && (
                <div className="text-center py-10">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-300" />
                </div>
              )}
              {!messagesLoading && messages.length === 0 && !pendingConv && (
                <div className="text-center text-xs text-gray-400 py-10">
                  Nenhuma mensagem ainda.
                </div>
              )}
              {pendingConv && messages.length === 0 && !messagesLoading && (
                <div className="text-center text-xs text-gray-400 py-10">
                  Envie a primeira mensagem para iniciar a conversa.
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.senderType === 'user'
                        ? 'bg-[#D42026] text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="leading-snug">{msg.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'user' ? 'text-red-200' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {sendError && (
              <div className="mx-4 mb-1 flex items-center gap-2 text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {sendError}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <button type="button" onClick={noApiToast} className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button type="button" onClick={noApiToast} className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(e as unknown as React.FormEvent)
                    }
                  }}
                  rows={1}
                  placeholder={`Escreva uma mensagem para ${activeDisplayName}...`}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D42026]/40 resize-none bg-gray-50"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={sendStatus === 'loading' || !message.trim()}
                  className="p-2.5 bg-[#D42026] text-white rounded-full hover:bg-[#b91c1c] disabled:opacity-50 transition-colors shrink-0"
                >
                  {sendStatus === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-sm font-semibold text-gray-500">Selecione uma conversa</p>
            <p className="text-xs mt-1 text-gray-400">ou clique em &quot;Nova&quot; para iniciar</p>
          </div>
        )}
      </div>
      <EditProjectConfigModal />
    </div>
  )
}
