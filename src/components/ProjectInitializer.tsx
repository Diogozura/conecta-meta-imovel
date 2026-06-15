'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import CreateProjectForm from './CreateProjectForm'
import { Loader2 } from 'lucide-react'
import type { Project } from '@/lib/firebase-types'

const STORAGE_KEY = 'active_project_id'

export default function ProjectInitializer({
  children,
  allowCreateProject = true,
}: {
  children: React.ReactNode
  allowCreateProject?: boolean
}) {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext()
  const { currentProject, setCurrentProject } = useProject()
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!loading) return
    timeoutRef.current = setTimeout(() => {
      console.warn('Timeout no ProjectInitializer')
      setLoading(false)
    }, 7000)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [loading])

  useEffect(() => {
    if (authLoading) return

    async function loadProjects() {
      if (!isAuthenticated || !user) {
        setLoading(false)
        return
      }
      try {
        // Busca projetos onde é owner E onde é colaborador
        const [owned, collaborated] = await Promise.all([
          projectService.getUserProjects(user.uid),
          projectService.getCollaboratorProjects(user.uid),
        ])
        // Merge sem duplicatas pelo ID
        const seen = new Set<string>()
        const projects = [...owned, ...collaborated].filter(p => {
          if (!p.id || seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })

        setUserProjects(projects)

        if (projects.length > 0) {
          const savedId = localStorage.getItem(STORAGE_KEY)
          const toActivate = projects.find(p => p.id === savedId) ?? projects[0]
          setCurrentProject(toActivate)
        }
      } catch (err) {
        console.error('Erro ao carregar projetos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, authLoading])

  // Persiste a seleção no localStorage sempre que o projeto ativo muda
  useEffect(() => {
    if (currentProject?.id) {
      localStorage.setItem(STORAGE_KEY, currentProject.id)
    }
  }, [currentProject?.id])

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

  if (allowCreateProject && userProjects.length === 0 && !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Crie seu primeiro projeto</h2>
          <CreateProjectForm />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
