'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { useProject } from '@/lib/project-context'
import projectService from '@/lib/project-service'
import type { Project } from '@/lib/firebase-types'
import { ChevronDown } from 'lucide-react'

export function ProjectSelector() {
  const { userData } = useAuthContext()
  const { currentProject, setCurrentProject } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.id) return

    const loadProjects = async () => {
      try {
        const [owned, collab] = await Promise.all([
          projectService.getUserProjects(userData.id!),
          projectService.getCollaboratorProjects(userData.id!),
        ])
        const seen = new Set<string>()
        const merged = [...owned, ...collab].filter(p => {
          if (!p.id || seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })
        setProjects(merged)

        // Só auto-seleciona o primeiro se nenhum projeto estiver ativo no contexto
        if (merged.length > 0 && !currentProject) {
          setCurrentProject(merged[0])
        }
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id])

  if (loading) {
    return <div className="px-4 py-2 text-xs text-gray-500 animate-pulse">Carregando...</div>
  }

  if (projects.length === 0) {
    return <div className="px-4 py-2 text-xs text-gray-500">Sem projetos</div>
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-white"
      >
        <span className="truncate">{currentProject?.name || 'Selecione um projeto'}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => { setCurrentProject(project); setIsOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                project.id === currentProject?.id
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
