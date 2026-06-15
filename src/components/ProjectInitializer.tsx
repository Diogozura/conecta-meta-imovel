'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import CreateProjectForm from './CreateProjectForm'
import { Loader2 } from 'lucide-react'

/**
 * Componente que verifica se há um projeto configurado.
 * Se não houver, mostra um formulário para criar um.
 * Se houver, renderiza os children normalmente.
 */
export default function ProjectInitializer({
  children,
  allowCreateProject = true
}: {
  children: React.ReactNode
  allowCreateProject?: boolean
}) {
  const { user, userData, isAuthenticated, loading: authLoading } = useAuthContext()
  const { currentProject } = useProject()
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Timeout de segurança: se passar de 7 segundos, força finalização do loading
  useEffect(() => {
    if (loading) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Timeout no carregamento do ProjectInitializer, finalizando loading')
        setLoading(false)
      }, 7000)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loading])

  useEffect(() => {
    async function loadProjects() {
      // Espera até que auth tenha terminado de carregar
      if (authLoading) {
        return
      }

      if (!isAuthenticated || !user) {
        setLoading(false)
        return
      }

      try {
        const projects = await projectService.getUserProjects(user.uid)
        setUserProjects(projects)
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [isAuthenticated, user, authLoading])

  // Ainda carregando
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    )
  }

  
  // Há projetos - renderizar conteúdo normal
  return <>{children}</>
}
