'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
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
  Plug,
} from 'lucide-react'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { RealtimeListeners } from '@/components/RealtimeListeners'

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText },
  { href: '/dashboard/numeros', label: 'Números', icon: PhoneCall },
  { href: '/dashboard/onboarding', label: 'Conectar WABA', icon: Plug },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
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
          {navItems.map((item) => {
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

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-[#D42026]/20 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </form>
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
  )
}
