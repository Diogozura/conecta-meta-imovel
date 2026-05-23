'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MessageSquare, Search, Send, Loader2, AlertCircle, Plus, X,
  ArrowRightLeft, MoreVertical, Paperclip, Smile,
} from 'lucide-react'
import { toast } from 'sonner'

type Message = {
  id: string
  text: string
  direction: 'sent' | 'received'
  time: string
}

type Conversation = {
  name: string
  number: string
  last: string
  time: string
  status: 'Recebida' | 'Enviada'
  messages: Message[]
  unread?: boolean
}

const STORAGE_KEY = 'meta-conversas'

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

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
  } catch {}
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
  const [conversations, setConversations] = useState<Conversation[]>(() => loadFromStorage())
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
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
  const searchParams = useSearchParams()

  useEffect(() => {
    saveToStorage(conversations)
  }, [conversations])

  useEffect(() => {
    const from = searchParams.get('from')
    if (!from) return
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.number.replace(/\D/g, '') === from.replace(/\D/g, ''))
      if (idx !== -1) {
        setSelectedIdx(idx)
        return prev
      }
      const newConv: Conversation = {
        name: from,
        number: from,
        last: '',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'Recebida',
        messages: [],
      }
      setSelectedIdx(0)
      return [newConv, ...prev]
    })
  }, [searchParams])

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.number.includes(search.replace(/\D/g, ''))
  )

  const currentConv = selectedIdx !== null ? conversations[selectedIdx] : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConv?.messages.length])

  useEffect(() => {
    let since = Date.now()
    const poll = async () => {
      try {
        const res = await fetch(`/api/messages?since=${since}`)
        if (!res.ok) return
        const { messages, serverTime } = (await res.json()) as {
          messages: { id: string; from: string; text: string; timestamp: number }[]
          serverTime: number
        }
        since = serverTime
        if (messages.length === 0) return
        setConversations((prev) => {
          let next = [...prev]
          for (const data of messages) {
            const incomingTime = new Date(data.timestamp * 1000).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
            const incomingMsg: Message = {
              id: data.id,
              text: data.text,
              direction: 'received',
              time: incomingTime,
            }
            const idx = next.findIndex(
              (c) => c.number.replace(/\D/g, '') === data.from.replace(/\D/g, '')
            )
            if (idx !== -1) {
              if (next[idx].messages.some((m) => m.id === data.id)) continue
              next = next.map((c, i) =>
                i === idx
                  ? {
                      ...c,
                      messages: [...c.messages, incomingMsg],
                      last: incomingMsg.text,
                      time: incomingTime,
                      status: 'Recebida' as const,
                      unread: i !== selectedIdx,
                    }
                  : c
              )
            } else {
              next = [
                {
                  name: data.from,
                  number: data.from,
                  last: incomingMsg.text,
                  time: incomingTime,
                  status: 'Recebida' as const,
                  messages: [incomingMsg],
                  unread: true,
                },
                ...next,
              ]
            }
          }
          return next
        })
      } catch {
        // silencioso
      }
    }
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [selectedIdx])

  function now() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || selectedIdx === null) return
    const conv = conversations[selectedIdx]
    const newMsg: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      direction: 'sent',
      time: now(),
    }
    const msgText = message.trim()
    setConversations((prev) =>
      prev.map((c, i) =>
        i === selectedIdx
          ? { ...c, messages: [...c.messages, newMsg], last: msgText, time: newMsg.time, status: 'Enviada' }
          : c
      )
    )
    setMessage('')
    setSendStatus('loading')
    setSendError('')
    try {
      const res = await fetch('/api/meta/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: conv.number.replace(/\D/g, ''), message: msgText }),
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
    const name = newName.trim() || newNumber.trim()
    const newConv: Conversation = {
      name,
      number: newNumber.replace(/\D/g, ''),
      last: '',
      time: now(),
      status: 'Enviada',
      messages: [],
    }
    setConversations((prev) => [newConv, ...prev])
    setSelectedIdx(0)
    setShowNewForm(false)
    setNewNumber('')
    setNewName('')
  }

  function handleSelectConv(idx: number) {
    setSelectedIdx(idx)
    setSendError('')
    setConversations((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, unread: false } : c))
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -mx-6 -my-6">
      {/* LEFT PANEL */}
      <div className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
            <button
              onClick={() => setShowNewForm((v) => !v)}
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
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome (opcional)"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D42026]/50"
              />
              <input
                type="text"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
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

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa, contato ou telefone"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#D42026]/50"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar mb-2">
            {FILTER_TABS.map((tab) => (
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

          {/* Channel filters */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {CHANNEL_TABS.map((ch) => (
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

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.map((c) => {
            const idx = conversations.indexOf(c)
            const color = avatarColor(c.name)
            const isSelected = selectedIdx === idx
            return (
              <button
                key={idx}
                onClick={() => handleSelectConv(idx)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? 'bg-red-50 border-l-2 border-[#D42026]'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${color}`}>
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{c.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mb-1">{c.number} · WhatsApp</p>
                  <p className="text-[11px] text-gray-500 truncate mb-1.5">{c.last || 'Nenhuma mensagem'}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      WhatsApp
                    </span>
                    {c.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#D42026] shrink-0 ml-auto" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden">
        {currentConv ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarColor(currentConv.name)}`}>
                {getInitials(currentConv.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentConv.name}</p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    WhatsApp
                  </span>
                </div>
                <p className="text-xs text-gray-500">{currentConv.number}</p>
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

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {currentConv.messages.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-10">
                  Nenhuma mensagem ainda. Envie a primeira!
                </div>
              )}
              {currentConv.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.direction === 'sent'
                        ? 'bg-[#D42026] text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="leading-snug">{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.direction === 'sent' ? 'text-red-200' : 'text-gray-400'}`}>
                      {msg.time}
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

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={noApiToast}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  title="Anexar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={noApiToast}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(e as unknown as React.FormEvent)
                    }
                  }}
                  rows={1}
                  placeholder={`Escreva uma mensagem para ${currentConv.name}...`}
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
            <p className="text-xs mt-1 text-gray-400">ou clique em "Nova" para iniciar</p>
          </div>
        )}
      </div>
    </div>
  )
}
