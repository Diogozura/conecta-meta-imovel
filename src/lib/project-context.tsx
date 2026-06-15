'use client'

import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react'
import {
  collection, query, where, onSnapshot, limit, Unsubscribe,
} from 'firebase/firestore'
import { firestore } from './firebase'
import { fetchApi } from './api-client'
import type { Project, Conversation } from './firebase-types'

export interface MetaTemplate {
  id: string
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED'
  category: string
  language: string
  components: unknown[]
}

interface ProjectContextType {
  currentProject: Project | null
  // Mantém a API original usada por ProjectSelector e ProjectInitializer
  setCurrentProject: (project: Project | null) => void

  // Conversas em tempo real via Firestore onSnapshot
  conversations: Conversation[]
  conversationsLoading: boolean

  // Templates da API do Meta — recarregados ao trocar de projeto
  templates: MetaTemplate[]
  templatesLoading: boolean
  refreshTemplates: () => Promise<void>

  // Configs derivadas do projeto ativo (sem businessToken — fica server-side)
  metaConfig: {
    APP_ID?: string
    GRAPH_API_VERSION?: string
    EMBEDDED_SIGNUP_CONFIG_ID?: string
    WEBHOOK_VERIFY_TOKEN?: string
  }
  wabaConfig: {
    WABA_ID?: string
    PHONE_NUMBER_ID?: string
    // BUSINESS_TOKEN removido — acesso somente via server-side (project_secrets)
  }
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [templates, setTemplates] = useState<MetaTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  const fetchTemplates = useCallback(async (projectId: string) => {
    setTemplatesLoading(true)
    try {
      const res = await fetchApi(`/api/meta/list-templates?projectId=${projectId}`)
      if (!res.ok) throw new Error('Falha ao buscar templates')
      const json = await res.json()
      setTemplates(json.templates ?? [])
    } catch (err) {
      console.error('[ProjectContext] Erro ao buscar templates:', err)
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const startConversationsListener = useCallback((projectId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    setConversationsLoading(true)

    const q = query(
      collection(firestore, 'conversations'),
      where('projectId', '==', projectId),
      limit(50),
    )

    unsubscribeRef.current = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Conversation))
      setConversationsLoading(false)
    }, (err) => {
      console.error('[ProjectContext] Listener erro:', err)
      setConversationsLoading(false)
    })
  }, [])

  // Ponto de entrada único para troca de projeto — usado por ProjectSelector e ProjectInitializer
  const setCurrentProject = useCallback((project: Project | null) => {
    setCurrentProjectState(project)
    setConversations([])
    setTemplates([])

    if (project?.id) {
      startConversationsListener(project.id)
      void fetchTemplates(project.id)
    } else {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [startConversationsListener, fetchTemplates])

  const refreshTemplates = useCallback(async () => {
    if (currentProject?.id) await fetchTemplates(currentProject.id)
  }, [currentProject?.id, fetchTemplates])

  // Limpa o listener ao desmontar
  useEffect(() => () => { if (unsubscribeRef.current) unsubscribeRef.current() }, [])

  const metaConfig = {
    APP_ID: currentProject?.metaConfig?.APP_ID,
    GRAPH_API_VERSION: currentProject?.metaConfig?.GRAPH_API_VERSION,
    EMBEDDED_SIGNUP_CONFIG_ID: currentProject?.metaConfig?.EMBEDDED_SIGNUP_CONFIG_ID,
    WEBHOOK_VERIFY_TOKEN: currentProject?.metaConfig?.WEBHOOK_VERIFY_TOKEN,
  }

  const wabaConfig = {
    WABA_ID: currentProject?.waba?.WABA_ID ?? currentProject?.waba?.wabaId,
    PHONE_NUMBER_ID: currentProject?.waba?.PHONE_NUMBER_ID ?? currentProject?.waba?.phoneNumberId,
  }

  return (
    <ProjectContext.Provider value={{
      currentProject,
      setCurrentProject,
      conversations,
      conversationsLoading,
      templates,
      templatesLoading,
      refreshTemplates,
      metaConfig,
      wabaConfig,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject deve ser usado dentro de ProjectProvider')
  return context
}
