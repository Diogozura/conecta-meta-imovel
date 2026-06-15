'use client'

import { useMetaConfig } from '@/lib/use-meta-config'
import { AlertCircle } from 'lucide-react'

export function MetaConfigAlert() {
  const { isConfigured, isMissingPhoneNumber, isMissingWabaId } =
    useMetaConfig()

  if (isConfigured) {
    return null
  }

  const missingItems = []
  if (isMissingWabaId) missingItems.push('WABA ID')
  if (isMissingPhoneNumber) missingItems.push('Phone Number ID')

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-red-900 mb-1">Configuração Incompleta</h3>
        <p className="text-sm text-red-800">
          Faltam dados para conectar ao WhatsApp Business API: {missingItems.join(', ')}
        </p>
        <p className="text-xs text-red-700 mt-2">
          Contate o administrador para configurar o projeto.
        </p>
      </div>
    </div>
  )
}
