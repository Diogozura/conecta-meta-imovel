/* ─── Types ──────────────────────────────────────────────────────────────── */

export type Direction = 'inbound' | 'outbound'

export type Message = {
  id: string
  text: string
  direction: Direction
  timestamp: number // unix seconds
}

export type Conversation = {
  number: string
  name: string
  messages: Message[]
}

export type ConversationStore = Record<string, Conversation>

/* ─── Constants ──────────────────────────────────────────────────────────── */

export const CONVERSATIONS_KEY = 'scale_conversations'
export const WHATSAPP_MESSAGE_EVENT = 'whatsapp-new-message'

/* ─── Storage helpers ────────────────────────────────────────────────────── */

export function loadConversations(): ConversationStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    return raw ? (JSON.parse(raw) as ConversationStore) : {}
  } catch {
    return {}
  }
}

export function saveConversations(store: ConversationStore): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(store))
}

export function addMessageToStore(
  store: ConversationStore,
  number: string,
  msg: Message,
  name?: string,
): ConversationStore {
  const existing = store[number] ?? { number, name: name ?? number, messages: [] }
  // Deduplicate by id
  const alreadyExists = existing.messages.some((m) => m.id === msg.id)
  if (alreadyExists) return store
  return {
    ...store,
    [number]: {
      ...existing,
      name: name ?? existing.name,
      messages: [...existing.messages, msg],
    },
  }
}

/** Persist an inbound message from the Pusher payload, returns the updated store */
export function persistInboundMessage(data: {
  id?: string
  from: string
  text?: string
  timestamp?: string | number
}): ConversationStore {
  const store = loadConversations()
  const msg: Message = {
    id: data.id ?? crypto.randomUUID(),
    text: data.text ?? '',
    direction: 'inbound',
    timestamp: Number(data.timestamp) || Math.floor(Date.now() / 1000),
  }
  const updated = addMessageToStore(store, data.from, msg)
  saveConversations(updated)
  return updated
}
