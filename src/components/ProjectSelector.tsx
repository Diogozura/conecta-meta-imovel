'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { useRole } from '@/lib/use-role'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import type { Project } from '@/lib/firebase-types'
import { ChevronDown } from 'lucide-react'

interface ProjectSelectorProps {
  currentProjectId?: string
  onProjectChange?: (projectId: string) => void
}

export function ProjectSelector({ currentProjectId, onProjectChange }: ProjectSelectorProps) {
  const { userData } = useAuthContext()
  const { isAdmin, can } = useRole()
  const { setCurrentProject } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProjects = async () => {
      if (!userData?.id) return

      try {
        let userProjects: Project[] = []

        if (can.viewAllProjects) {
          // Admin vê todos
          const allProjects = await projectService.getUserProjects(userData.id)
          userProjects = allProjects
        } else {
          // WABA Manager vê seus projetos
          if (can.createProjects) {
            const ownProjects = await projectService.getUserProjects(userData.id)
            userProjects = ownProjects
          }

          // Todos veem projetos onde são colaboradores
          const collaboratorProjects = await projectService.getCollaboratorProjects(userData.id)
          userProjects = [...new Set([...userProjects, ...collaboratorProjects])]
        }

        setProjects(userProjects)

        // Carrega primeiro projeto automaticamente
        if (userProjects.length > 0 && !currentProjectId) {
          setCurrentProject(userProjects[0])
        }
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [userData?.id, can.viewAllProjects, can.createProjects])

  const selectedProject = projects.find((p) => p.id === currentProjectId) || projects[0]

  const handleProjectChange = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      onProjectChange?.(projectId)
      setIsOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-gray-500 animate-pulse">Carregando...</div>
    )
  }

  if (projects.length === 0) {
    return <div className="px-4 py-2 text-xs text-gray-500">Sem projetos</div>
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-white"
      >
        <span className="truncate">{selectedProject?.name || 'Selecione um projeto'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectChange(project.id!)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                project.id === currentProjectId
                  ? 'bg-[#D42026] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
