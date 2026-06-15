'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'
import { ProtectedRoute } from '@/lib/protected-route'
import { useAuthContext } from '@/lib/auth-context'
import {
  MessageSquare,
  Users,
  FileText,
  PhoneCall,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  BookUser,
  UserCircle,
  UsersRound,
  Zap,
  ScrollText,
  Megaphone,
  BarChart2,
  Settings,
  Inbox,
  Radio,
  Shield,
} from 'lucide-react'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { RealtimeListeners } from '@/components/RealtimeListeners'
import { ProjectSelector } from '@/components/ProjectSelector'
import { useRole } from '@/lib/use-role'
import ProjectInitializer from '@/components/ProjectInitializer'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/numeros', label: 'Canais', icon: Radio },
  { href: '/dashboard/conversas', label: 'Inbox', icon: Inbox },
  { href: '/dashboard/contatos', label: 'Contatos', icon: BookUser },
  { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCircle },
  { href: '/dashboard/equipes', label: 'Equipes e Setores', icon: UsersRound },
  { href: '/dashboard/automacoes', label: 'Automações', icon: Zap },
  { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText },
  { href: '/dashboard/campanhas', label: 'Campanhas', icon: Megaphone },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart2 },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userData } = useAuthContext()
  const { isAdmin } = useRole()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('')

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Filtrar items de navegação baseado em role
  const filteredNavItems = navItems.filter((item: any) => {
    if (item.adminOnly) return isAdmin
    return true
  })

  return (
    <ProtectedRoute>
      <ProjectInitializer>
        <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#111111] flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center px-6 py-5 border-b border-white/10">
          <Image
            src="/Logos PNG/Logo-06.png"
            alt="scale Estratégia Digital"
            width={140}
            height={54}
            className="brightness-0 invert"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item: any) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  active
                    ? 'bg-[#D42026] text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 text-white/70" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: status + user + logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-3">
          {/* Plataforma Online */}
          <div className="flex items-center gap-2 px-3">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs text-gray-400">Plataforma Online</span>
          </div>

          {/* Project Selector */}
          <div className="px-3">
            <ProjectSelector
              currentProjectId={selectedProject}
              onProjectChange={setSelectedProject}
            />
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-[#D42026] flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {userData?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userData?.name || 'Usuário'}</p>
              <p className="text-[10px] text-gray-500 truncate">{userData?.email || 'sem email'}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-[#D42026]/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
          <button
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-800">
              {navItems.find((n) => n.href === pathname)?.label ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#D42026] rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">S</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Alertas bonitinhos e Listeners de Webhooks em tempo real */}
      <Toaster richColors />
      <RealtimeListeners />
        </div>
      </ProjectInitializer>
    </ProtectedRoute>
  )
}
