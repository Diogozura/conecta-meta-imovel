'use client'

import { toast } from 'sonner'
import { Settings } from 'lucide-react'

function noApiToast() {
  toast.info('puts, por enquanto sem API para essa funcionalidade 😅')
}

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500">Personalize as configurações da plataforma.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Settings className="w-8 h-8 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">Seção em desenvolvimento</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Esta funcionalidade estará disponível em breve. Clique no botão para saber mais.
          </p>
        </div>
        <button
          onClick={noApiToast}
          className="px-4 py-2 bg-[#D42026] text-white text-sm font-semibold rounded-lg hover:bg-[#b91c1c] transition-colors"
        >
          Saiba mais
        </button>
      </div>
    </div>
  )
}
