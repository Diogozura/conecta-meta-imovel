'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { createPusherClient } from '@/lib/pusher'
import {
  persistInboundMessage,
  WHATSAPP_MESSAGE_EVENT,
} from '@/lib/conversation-store'

export function RealtimeListeners() {
  useEffect(() => {
    const pusherClient = createPusherClient()
    const channel = pusherClient.subscribe('whatsapp-chat')

    channel.bind('new-message', (data: any) => {
      // 1. Persiste no localStorage (fonte de verdade global)
      persistInboundMessage(data)

      // 2. Notifica componentes montados na mesma aba (ex: página de conversas)
      window.dispatchEvent(
        new CustomEvent(WHATSAPP_MESSAGE_EVENT, { detail: data }),
      )

      // 3. Toast de alerta
      toast.success(`Nova mensagem de ${data.from}`, {
        description: data.text || 'Mensagem recebida',
        duration: 5000,
        position: 'top-right',
      })
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusherClient.disconnect()
    }
  }, [])

  return null
}