// Hook para usar dados Meta do projeto atual
'use client'

import { useProject } from '@/lib/project-context'

export function useMetaConfig() {
  const { metaConfig, wabaConfig, currentProject } = useProject()

  return {
    // Meta Config
    appId: metaConfig?.APP_ID,
    graphApiVersion: metaConfig?.GRAPH_API_VERSION || 'v21.0',
    embeddedSignupConfigId: metaConfig?.EMBEDDED_SIGNUP_CONFIG_ID,
    webhookVerifyToken: metaConfig?.WEBHOOK_VERIFY_TOKEN,

    // WABA Config
    wabaId: wabaConfig?.WABA_ID,
    phoneNumberId: wabaConfig?.PHONE_NUMBER_ID,
    businessToken: wabaConfig?.BUSINESS_TOKEN,

    // Verificações úteis
    isConfigured: !!(
      metaConfig?.APP_ID &&
      metaConfig?.GRAPH_API_VERSION &&
      wabaConfig?.WABA_ID &&
      wabaConfig?.PHONE_NUMBER_ID &&
      wabaConfig?.BUSINESS_TOKEN
    ),
    
    isMissingPhoneNumber: !wabaConfig?.PHONE_NUMBER_ID,
    isMissingBusinessToken: !wabaConfig?.BUSINESS_TOKEN,
    isMissingWabaId: !wabaConfig?.WABA_ID,

    currentProject,
  }
}
