'use client'

import { useMetaConfig } from '@/lib/use-meta-config'
import { MetaConfigAlert } from '@/components/MetaConfigAlert'

/**
 * Exemplo de como usar o hook useMetaConfig() para acessar dados Meta do projeto atual
 * 
 * Todos os dados agora vêm do Firestore (projeto selecionado)
 * e não mais do .env.local
 */
export function SendMessageFormExample() {
  const {
    isConfigured,
    wabaId,
    phoneNumberId,
    graphApiVersion,
    currentProject
  } = useMetaConfig()

  if (!isConfigured) {
    return <MetaConfigAlert />
  }

  // Dados do projeto/WABA estão disponíveis
  console.log('Projeto atual:', currentProject?.name)
  console.log('WABA ID:', wabaId)
  console.log('Phone Number ID:', phoneNumberId)
  console.log('Graph API Version:', graphApiVersion)

  // Você pode agora usar esses dados para fazer chamadas à Meta API
  // Exemplo:
  // const metaUrl = `https://graph.instagram.com/${graphApiVersion}/${phoneNumberId}/messages`
  // const response = await fetch(metaUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${businessToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     messaging_product: 'whatsapp',
  //     to: phoneNumber,
  //     type: 'template',
  //     template: { name: templateName }
  //   })
  // })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Exemplo: Dados do Projeto</h2>
      
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-gray-700">Projeto:</span>
          <span className="text-gray-600 ml-2">{currentProject?.name}</span>
        </p>
        <p>
          <span className="font-medium text-gray-700">WABA ID:</span>
          <span className="text-gray-600 ml-2">{wabaId}</span>
        </p>
        <p>
          <span className="font-medium text-gray-700">Phone Number ID:</span>
          <span className="text-gray-600 ml-2">{phoneNumberId}</span>
        </p>
        <p>
          <span className="font-medium text-gray-700">Graph API Version:</span>
          <span className="text-gray-600 ml-2">{graphApiVersion}</span>
        </p>
        <p className="text-xs text-gray-500 italic mt-4">
          ✅ Todos os dados vêm do Firestore (projeto selecionado), não do .env
        </p>
      </div>
    </div>
  )
}
