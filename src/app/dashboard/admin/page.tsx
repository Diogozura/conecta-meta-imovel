'use client'

import { useState, useEffect } from 'react'
import { useAuthContext } from '@/lib/auth-context'
import { RoleGuard } from '@/lib/role-guard'
import { useRole } from '@/lib/use-role'
import projectService from '@/lib/project-service'
import userService from '@/lib/user-service'
import type { Waba } from '@/lib/firebase-types'
import { Plus, CheckCircle, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPage() {
  const { user, userData } = useAuthContext()
  const { isAdmin } = useRole()
  const [wabas, setWabas] = useState<Waba[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewWaba, setShowNewWaba] = useState(false)
  const [formData, setFormData] = useState({
    wabaId: '',
    phoneNumberId: '',
    businessToken: '',
    clientName: '',
  })

  useEffect(() => {
    if (!user?.uid || !isAdmin) return

    const loadWabas = async () => {
      try {
        const adminWabas = await projectService.getAdminWabas(user.uid)
        setWabas(adminWabas)
      } catch (error) {
        console.error('Erro ao carregar WABAs:', error)
        toast.error('Erro ao carregar WABAs')
      } finally {
        setLoading(false)
      }
    }

    loadWabas()
  }, [user?.uid, isAdmin])

  const handleAddWaba = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.wabaId || !formData.clientName) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const newWabaId = await projectService.createWaba({
        wabaId: formData.wabaId,
        phoneNumberId: formData.phoneNumberId,
        businessToken: formData.businessToken,
        clientName: formData.clientName,
        adminId: userData?.id || '',
        status: 'pending',
      } as Waba)

      setWabas([
        ...wabas,
        {
          id: newWabaId,
          wabaId: formData.wabaId,
          phoneNumberId: formData.phoneNumberId,
          businessToken: formData.businessToken,
          clientName: formData.clientName,
          adminId: userData?.id || '',
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      setFormData({ wabaId: '', phoneNumberId: '', businessToken: '', clientName: '' })
      setShowNewWaba(false)
      toast.success('WABA cadastrado com sucesso!')
    } catch (error) {
      console.error('Erro ao adicionar WABA:', error)
      toast.error('Erro ao adicionar WABA')
    }
  }

  const handleApproveWaba = async (wabaId: string) => {
    try {
      await projectService.updateWabaStatus(wabaId, 'approved')
      setWabas(wabas.map((w) => (w.id === wabaId ? { ...w, status: 'approved' } : w)))
      toast.success('WABA aprovada!')
    } catch (error) {
      toast.error('Erro ao aprovar WABA')
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar WABAs</h1>
          <button
            onClick={() => setShowNewWaba(!showNewWaba)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D42026] text-white rounded-lg hover:bg-[#A81820] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova WABA
          </button>
        </div>

        {showNewWaba && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cadastrar Nova WABA</h2>
            <form onSubmit={handleAddWaba} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WABA ID *
                </label>
                <input
                  type="text"
                  value={formData.wabaId}
                  onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D42026]"
                  placeholder="Ex: 1492759332552105"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D42026]"
                  placeholder="Ex: Empresa XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={formData.phoneNumberId}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumberId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D42026]"
                  placeholder="Ex: 123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Token
                </label>
                <input
                  type="password"
                  value={formData.businessToken}
                  onChange={(e) =>
                    setFormData({ ...formData, businessToken: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D42026]"
                  placeholder="Token seguro"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D42026] text-white rounded-lg hover:bg-[#A81820] transition-colors"
                >
                  Cadastrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewWaba(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Carregando WABAs...</div>
          ) : wabas.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Nenhuma WABA cadastrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      WABA ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {wabas.map((waba) => (
                    <tr key={waba.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{waba.clientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{waba.wabaId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {statusIcon(waba.status)}
                          <span className="text-sm capitalize text-gray-600">{waba.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {waba.status === 'pending' && (
                          <button
                            onClick={() => handleApproveWaba(waba.id!)}
                            className="text-[#D42026] hover:text-[#A81820] font-medium transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
