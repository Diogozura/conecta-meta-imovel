'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Search,
  Send,
  MessageSquarePlus,
  X,
  Loader2,
  Phone,
  ChevronLeft,
} from 'lucide-react'
import {
  addMessageToStore,
  loadConversations,
  persistInboundMessage,
  saveConversations,
  WHATSAPP_MESSAGE_EVENT,
  type Conversation,
  type ConversationStore,
  type Message,
} from '@/lib/conversation-store'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (now.getTime() - d.getTime() < 86_400_000 * 2) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function sortedConversations(
  store: ConversationStore,
  query: string,
): Conversation[] {
  return Object.values(store)
    .filter((c) => {
      const q = query.toLowerCase()
      return !q || c.name.toLowerCase().includes(q) || c.number.includes(q)
    })
    .sort((a, b) => {
      const aLast = a.messages.at(-1)?.timestamp ?? 0
      const bLast = b.messages.at(-1)?.timestamp ?? 0
      return bLast - aLast
    })
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ConversasPage() {
  const [store, setStore] = useState<ConversationStore>({})
  const [activeNumber, setActiveNumber] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  // New conversation modal
  const [showNew, setShowNew] = useState(false)
  const [newTo, setNewTo] = useState('')
  const [newText, setNewText] = useState('')
  const [newStatus, setNewStatus] = useState<'idle' | 'loading'>('idle')
  const [newError, setNewError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Load from localStorage on mount ──────────────────────────────────────
  useEffect(() => {
    setStore(loadConversations())
  }, [])

  // ── Listen for inbound messages dispatched by RealtimeListeners ──────────
  useEffect(() => {
    function onNewMessage(e: Event) {
      const data = (e as CustomEvent).detail
      // persistInboundMessage already saved to localStorage in RealtimeListeners;
      // we just need to sync React state.
      setStore(loadConversations())
    }
    window.addEventListener(WHATSAPP_MESSAGE_EVENT, onNewMessage)
    return () => window.removeEventListener(WHATSAPP_MESSAGE_EVENT, onNewMessage)
  }, [])

  // ── Scroll to bottom when active conversation messages change ─────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store, activeNumber])

  // ── Derived state ─────────────────────────────────────────────────────────
  const conversations = sortedConversations(store, search)
  const activeConv = activeNumber ? store[activeNumber] : null

  // ── Send message in active conversation ───────────────────────────────────
  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = text.trim()
      if (!activeNumber || !trimmed || sendStatus === 'loading') return

      setSendStatus('loading')
      setText('')

      try {
        const res = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: activeNumber, message: trimmed }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar')

        const msg: Message = {
          id: json.messages?.[0]?.id ?? crypto.randomUUID(),
          text: trimmed,
          direction: 'outbound',
          timestamp: Math.floor(Date.now() / 1000),
        }
        setStore((prev) => {
          const updated = addMessageToStore(prev, activeNumber, msg)
          saveConversations(updated)
          return updated
        })
        setSendStatus('idle')
        textareaRef.current?.focus()
      } catch {
        setSendStatus('error')
        // restore text so the user doesn't lose it
        setText(trimmed)
        setTimeout(() => setSendStatus('idle'), 3000)
      }
    },
    [activeNumber, text, sendStatus],
  )

  // ── Start new conversation ────────────────────────────────────────────────
  async function handleNewConversation(e: React.FormEvent) {
    e.preventDefault()
    const cleanTo = newTo.replace(/\D/g, '')
    if (!cleanTo || !newText.trim()) return

    setNewStatus('loading')
    setNewError('')

    try {
      const res = await fetch('/api/meta/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanTo, message: newText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar')

      const msg: Message = {
        id: json.messages?.[0]?.id ?? crypto.randomUUID(),
        text: newText.trim(),
        direction: 'outbound',
        timestamp: Math.floor(Date.now() / 1000),
      }
      setStore((prev) => {
        const updated = addMessageToStore(prev, cleanTo, msg)
        saveConversations(updated)
        return updated
      })
      setActiveNumber(cleanTo)
      setShowNew(false)
      setNewTo('')
      setNewText('')
      setNewStatus('idle')
    } catch (err) {
      setNewStatus('idle')
      setNewError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // -m-6 cancels the p-6 from dashboard/layout; h-full fills the flex-1 main area
    <div className="-m-6 h-full flex overflow-hidden">

      {/* ── Left panel: conversation list ─────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white shrink-0 w-full md:w-80 lg:w-96 ${
          activeNumber ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-base">Conversas</h2>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Nova
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-6 text-center py-16">
              <MessageSquarePlus className="w-10 h-10 opacity-25" />
              <p className="text-sm leading-relaxed">
                Nenhuma conversa ainda.
                <br />
                Clique em &ldquo;Nova&rdquo; para começar.
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const last = c.messages.at(-1)
              const active = activeNumber === c.number
              return (
                <button
                  key={c.number}
                  onClick={() => setActiveNumber(c.number)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition-colors ${
                    active
                      ? 'bg-green-50 border-l-[3px] border-l-green-500'
                      : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-700">
                      {c.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      {last && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTime(last.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {last
                        ? (last.direction === 'outbound' ? '✓ ' : '') + last.text
                        : c.number}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Right panel: chat ─────────────────────────────────────────────── */}
      {activeConv ? (
        <div className={`flex-1 flex flex-col bg-gray-50 min-w-0 ${activeNumber ? 'flex' : 'hidden md:flex'}`}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setActiveNumber(null)}
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-700">
                {activeConv.name[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activeConv.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeConv.number}</span>
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
            {activeConv.messages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 mt-10">
                Nenhuma mensagem ainda. Envie a primeira!
              </p>
            ) : (
              activeConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-green-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                    }`}
                  >
                    <p className="leading-snug break-words whitespace-pre-wrap">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1 text-right select-none ${
                        msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send input */}
          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-200 shrink-0"
          >
            {sendStatus === 'error' && (
              <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-100 shadow">
                Falha ao enviar. Tente novamente.
              </p>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                // auto-grow
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Digite uma mensagem… (Enter para enviar)"
              rows={1}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none bg-gray-50 leading-snug"
              style={{ overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sendStatus === 'loading'}
              className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {sendStatus === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Empty state shown on desktop when nothing is selected */
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 flex-col gap-3 text-gray-400">
          <MessageSquarePlus className="w-12 h-12 opacity-20" />
          <p className="text-sm">Selecione uma conversa ou clique em &ldquo;Nova&rdquo;</p>
        </div>
      )}

      {/* ── New conversation modal ─────────────────────────────────────────── */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNew(false)
              setNewError('')
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Nova Conversa</h3>
              <button
                onClick={() => { setShowNew(false); setNewError('') }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleNewConversation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Número de destino (com DDI, sem espaços ou traços)
                </label>
                <input
                  type="tel"
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  placeholder="Ex: 5511999990000"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Mensagem
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={3}
                  required
                  placeholder="Digite a mensagem..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none transition-colors"
                />
              </div>

              {newError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  {newError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setNewError('') }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newStatus === 'loading'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {newStatus === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


