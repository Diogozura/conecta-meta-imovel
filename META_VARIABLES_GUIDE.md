# 🔌 Guia: Usar Dados Meta do Firebase

## ✅ Mudança Importante

Anteriormente, os dados Meta vinham do `.env.local`. Agora vêm do **Firestore** (projeto selecionado).

```
ANTES:  .env.local → Componentes
AGORA:  Firestore Project → Contexto → Componentes
```

## 🚀 Como Usar

### 1. Acessar Dados Meta do Projeto Atual

```typescript
'use client'

import { useMetaConfig } from '@/lib/use-meta-config'

export default function MinhaComponente() {
  const { 
    wabaId,                    // WABA ID do projeto
    phoneNumberId,             // Phone Number ID
    businessToken,             // Token de acesso
    graphApiVersion,           // Versão da API
    isConfigured,              // Se está tudo configurado
    currentProject             // Projeto atual selecionado
  } = useMetaConfig()

  if (!isConfigured) {
    return <p>Projeto não está configurado</p>
  }

  return <p>WABA: {wabaId}</p>
}
```

### 2. Mostrar Alerta se Não Estiver Configurado

```typescript
'use client'

import { MetaConfigAlert } from '@/components/MetaConfigAlert'

export default function MinhaComponente() {
  return (
    <>
      <MetaConfigAlert />
      {/* Resto do componente */}
    </>
  )
}
```

### 3. Fazer Chamada à Meta API

```typescript
'use client'

import { useMetaConfig } from '@/lib/use-meta-config'

export async function enviarMensagem(phoneNumber: string, mensagem: string) {
  const { phoneNumberId, businessToken, graphApiVersion, isConfigured } = useMetaConfig()

  if (!isConfigured) {
    throw new Error('Projeto não configurado')
  }

  const url = `https://graph.instagram.com/${graphApiVersion}/${phoneNumberId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${businessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: mensagem }
    })
  })

  return response.json()
}
```

## 📋 Dados Disponíveis

```typescript
const {
  // Meta API Config
  appId,                          // APP_ID
  graphApiVersion,                // Graph API version (padrão: v21.0)
  embeddedSignupConfigId,         // Config ID para signup
  webhookVerifyToken,             // Token para validar webhooks
  
  // WABA Config
  wabaId,                         // WhatsApp Business Account ID
  phoneNumberId,                  // Número registrado no WABA
  businessToken,                  // Token de acesso
  
  // Helpers
  isConfigured,                   // true se tudo está configurado
  isMissingPhoneNumber,           // true se falta Phone Number ID
  isMissingBusinessToken,         // true se falta token
  isMissingWabaId,               // true se falta WABA ID
  
  // Contexto
  currentProject                  // Projeto selecionado no dashboard
} = useMetaConfig()
```

## 🏗️ Arquitetura

```
Dashboard
  ├─ ProjectSelector
  │  └─ Carrega projeto do Firestore
  │     └─ setCurrentProject()
  │
  └─ ProjectContext
     ├─ currentProject
     ├─ metaConfig (do projeto)
     └─ wabaConfig (do projeto)
        │
        └─ useMetaConfig() ← Use em qualquer componente
           ├─ wabaId, phoneNumberId, businessToken...
           └─ isConfigured, isMissing...
```

## 🔒 Segurança

- ❌ Tokens **nunca** mais em `.env.local`
- ✅ Armazenados no Firestore
- ✅ Acessíveis apenas por Admin/WABA_MANAGER
- ✅ Sincronizados automaticamente
- ✅ Cada projeto tem suas próprias credenciais

## 📁 Arquivos

- **[src/lib/project-context.tsx](src/lib/project-context.tsx)** - Contexto do projeto
- **[src/lib/use-meta-config.ts](src/lib/use-meta-config.ts)** - Hook para acessar dados Meta
- **[src/lib/meta-config-service.ts](src/lib/meta-config-service.ts)** - Serviço para buscar do Firestore
- **[src/components/MetaConfigAlert.tsx](src/components/MetaConfigAlert.tsx)** - Alerta de configuração incompleta

## 🎯 Exemplo Completo

```typescript
'use client'

import { useMetaConfig } from '@/lib/use-meta-config'
import { MetaConfigAlert } from '@/components/MetaConfigAlert'

export default function ConversasPage() {
  const { 
    isConfigured, 
    wabaId, 
    phoneNumberId,
    currentProject 
  } = useMetaConfig()

  return (
    <div>
      <h1>Conversas - {currentProject?.name}</h1>
      
      <MetaConfigAlert />
      
      {isConfigured && (
        <div>
          <p>WABA: {wabaId}</p>
          <p>Número: {phoneNumberId}</p>
          {/* Lista de conversas */}
        </div>
      )}
    </div>
  )
}
```

## ✨ Benefícios

- ✅ Dados vêm do Firestore (nunca estavam seguros no .env)
- ✅ Cada projeto tem suas próprias credenciais
- ✅ Admin controla tudo via interface
- ✅ Colaboradores não veem tokens sensíveis
- ✅ Dinâmico: muda ao trocar de projeto

---

**Status**: ✅ Todos os dados Meta agora vêm do Firebase!

## 1. META_WABA_ID (WhatsApp Business Account ID)

Para enviar templates e gerenciar a conta, você precisa do ID da Conta do WhatsApp Business.

**Passo a passo:**
1. Acesse o **Meta for Developers**: [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Selecione o seu aplicativo (ex: `agente-zap`).
3. No menu lateral esquerdo, vá em **WhatsApp** > **Configuração da API** (ou *API Setup*).
4. Localize o bloco de envio de mensagens de teste.
5. Copie o valor que aparece em **Identificador da conta do WhatsApp Business** (WhatsApp Business Account ID). 
6. Cole esse valor na variável `META_WABA_ID`.

---

## 2. NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID

Esse ID informa ao front-end qual configuração de cadastro utilizar quando o usuário abre o pop-up de signup.

**Passo a passo:**
1. Ainda no **Meta for Developers**, com seu app selecionado.
2. No menu lateral esquerdo, logo abaixo de *WhatsApp*, clique na opção **Configurador de cadastro incorporado** (ou *Embedded Signup* / *Configurações do cliente OAuth*).
3. Se você ainda não criou uma configuração, siga as instruções na tela para criar (selecionando as opções padrão de WhatsApp).
4. Ao final da criação, o painel irá gerar um **ID de Configuração** (*Configuration ID*).
5. Copie esse ID e cole na variável `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`.

---

## 3. META_BUSINESS_TOKEN (Token Permanente)

Na tela de "Configuração da API" o Meta fornece um token, mas **ATENÇÃO: ele é temporário e expira em 24h**. Para o sistema rodar sem interrupções em produção, você precisa de um token de Usuário do Sistema Permanente.

**Passo a passo:**
1. Acesse as **Configurações do Gerenciador de Negócios**: [business.facebook.com/settings](https://business.facebook.com/settings).
2. No menu lateral esquerdo, expanda **Usuários** e clique em **Usuários do sistema**.
3. Se não houver nenhum, clique em **Adicionar** e crie um usuário garantindo o cargo de **Administrador**.
4. Selecione o usuário recém-criado e clique no botão **Gerar novo token**.
5. No pop-up:
   - **Aplicativo:** Selecione o seu aplicativo da lista (ex: `agente-zap`).
   - **Permissões:** Role a lista de permissões e marque OBRIGATORIAMENTE `whatsapp_business_messaging` e `whatsapp_business_management`.
6. Finalize clicando em **Gerar token**.
7. Um token longo começando com **EAA...** será exibido. **Copie imediatamente** pois ele não aparecerá de novo.
## 4. META_APP_SECRET (Chave Secreta do Aplicativo)

O App Secret é crucial para a segurança do seu Webhook. Ele é usado pela API para descriptografar os eventos e mensagens que chegam do WhatsApp; se estiver incorreto, seu Webhook retornará erro 401.

**Passo a passo:**
1. Acesse o **Meta for Developers**: [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Selecione o seu aplicativo (`agente-zap`).
3. No menu lateral esquerdo, expanda **Configurações do Aplicativo** (Settings) e clique em **Básico** (Basic).
4. No topo da tela, você verá o campo **Chave Secreta do Aplicativo** (App Secret).
5. Clique no botão **Mostrar** (será necessário digitar sua senha do Facebook).
6. Copie a chave (é um código hexadecimal de 32 caracteres, como `a1b2c3d4...`).
7. Cole o valor na sua variável `META_APP_SECRET`. *(Atenção: esse código nunca começa com "EAA...")*.
8. Lembre-se de atualizar na Vercel e realizar um **Redeploy** para a alteração entrar em vigor em produção.

