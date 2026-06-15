'use client'

import { useProject } from '@/lib/project-context'

export function useMetaConfig() {
  const { metaConfig, wabaConfig, currentProject } = useProject()

  return {
    appId: metaConfig?.APP_ID,
    graphApiVersion: metaConfig?.GRAPH_API_VERSION || 'v21.0',
    embeddedSignupConfigId: metaConfig?.EMBEDDED_SIGNUP_CONFIG_ID,
    webhookVerifyToken: metaConfig?.WEBHOOK_VERIFY_TOKEN,

    wabaId: wabaConfig?.WABA_ID,
    phoneNumberId: wabaConfig?.PHONE_NUMBER_ID,
    // businessToken removido do cliente — acesso somente server-side via project_secrets

    isConfigured: !!(
      metaConfig?.APP_ID &&
      wabaConfig?.WABA_ID &&
      wabaConfig?.PHONE_NUMBER_ID
    ),
    isMissingPhoneNumber: !wabaConfig?.PHONE_NUMBER_ID,
    isMissingWabaId: !wabaConfig?.WABA_ID,

    currentProject,
  }
}
