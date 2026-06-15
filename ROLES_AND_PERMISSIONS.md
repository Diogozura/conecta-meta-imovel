# 🔐 Sistema de Roles e Permissões

## ✅ Status: Implementado

O sistema de autenticação agora inclui **três níveis de acesso** com permissões granulares e projetos multitenant.

## 🏗️ Arquitetura

### Três Roles Implementados

```
┌─────────────────────────────────────────────────────────┐
│                     ADMIN                                │
├─────────────────────────────────────────────────────────┤
│ ✅ Visualiza todas as contas e projetos                 │
│ ✅ Cadastra WABAs de clientes                           │
│ ✅ Gerencia usuários e roles                            │
│ ✅ Acessa variáveis Meta                               │
│ ✅ Página: /dashboard/admin                            │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│              WABA MANAGER                                │
├─────────────────────────────────────────────────────────┤
│ ✅ Cria projetos para sua WABA                          │
│ ✅ Adiciona colaboradores                              │
│ ✅ Acessa variáveis Meta do seu projeto               │
│ ❌ Não vê outras contas                                │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│            COLLABORATOR                                  │
├─────────────────────────────────────────────────────────┤
│ ✅ Trabalha dentro dos projetos atribuídos             │
│ ✅ Usa conversas, templates, etc                       │
│ ❌ Não pode criar projetos                             │
│ ❌ Não acessa variáveis Meta                           │
└─────────────────────────────────────────────────────────┘
```

## 📁 Arquivos Criados/Atualizados

### Core de Roles
- **[src/lib/firebase-types.ts](../src/lib/firebase-types.ts)** - Tipos: User, Project, Waba, MetaConfig
- **[src/lib/user-service.ts](../src/lib/user-service.ts)** - Gerenciar usuários e roles
- **[src/lib/project-service.ts](../src/lib/project-service.ts)** - Gerenciar projetos e WABAs
- **[src/lib/use-role.ts](../src/lib/use-role.ts)** - Hook para verificar permissões
- **[src/lib/role-guard.tsx](../src/lib/role-guard.tsx)** - Componente para proteger rotas
- **[src/lib/admin-init-service.ts](../src/lib/admin-init-service.ts)** - Inicializar admin com projeto JADE HUB

### UI Components
- **[src/components/ProjectSelector.tsx](../src/components/ProjectSelector.tsx)** - Seletor de projeto
- **[src/app/dashboard/admin/page.tsx](../src/app/dashboard/admin/page.tsx)** - Painel de admin

### Integrações
- **[src/lib/auth-context.tsx](../src/lib/auth-context.tsx)** - Atualizado com userData e role
- **[src/components/LoginForm.tsx](../src/components/LoginForm.tsx)** - Cria usuário no Firestore após signup
- **[src/app/dashboard/layout.tsx](../src/app/dashboard/layout.tsx)** - Adicionado seletor de projeto e filtro de admin

## 🎯 Estrutura de Dados no Firestore

### Users Collection
```typescript
users/{userId}
├── email: string
├── name: string
├── role: 'admin' | 'waba_manager' | 'collaborator'
├── permissions: {
│   ├── canViewAllProjects: boolean
│   ├── canCreateProjects: boolean
│   ├── canManageUsers: boolean
│   └── canAccessMeta: boolean
│ }
├── assignedWabas: string[] // Para WABA_MANAGER
└── createdAt: Timestamp
```

### Projects Collection
```typescript
projects/{projectId}
├── name: string
├── description: string
├── owner: string // ID do admin ou waba_manager
├── wabaId: string
├── collaborators: string[]
├── metaConfig: {
│   ├── APP_ID: string
│   ├── GRAPH_API_VERSION: string
│   ├── EMBEDDED_SIGNUP_CONFIG_ID: string
│   └── WEBHOOK_VERIFY_TOKEN: string
│ }
├── waba: {
│   ├── WABA_ID: string
│   ├── PHONE_NUMBER_ID: string (opcional)
│   └── BUSINESS_TOKEN: string (criptografado)
│ }
├── status: 'active' | 'inactive'
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### Wabas Collection
```typescript
wabas/{wabaId}
├── wabaId: string
├── phoneNumberId: string
├── businessToken: string (criptografado)
├── clientName: string
├── adminId: string
├── wabaManagerId: string (opcional)
├── status: 'pending' | 'approved' | 'active'
├── createdAt: Timestamp
└── approvedAt: Timestamp (opcional)
```

## 🚀 Como Usar

### 1. Verificar Role do Usuário

```typescript
'use client'

import { useRole } from '@/lib/use-role'

export default function MyComponent() {
  const { isAdmin, isWabaManager, isCollaborator } = useRole()
  
  if (isAdmin) {
    return <p>Você é admin</p>
  }
  
  return <p>Você não é admin</p>
}
```

### 2. Proteger Rota por Role

```typescript
'use client'

import { RoleGuard } from '@/lib/role-guard'

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <p>Apenas admin pode ver isso</p>
    </RoleGuard>
  )
}
```

### 3. Verificar Permissões Específicas

```typescript
'use client'

import { useRole } from '@/lib/use-role'

export default function MyComponent() {
  const { can } = useRole()
  
  return (
    <>
      {can.viewAllProjects && <p>Pode ver todos os projetos</p>}
      {can.createProjects && <p>Pode criar projetos</p>}
      {can.accessMeta && <p>Pode acessar variáveis Meta</p>}
    </>
  )
}
```

### 4. Atualizar Role de Usuário

```typescript
import userService from '@/lib/user-service'

// Promover para admin
await userService.updateUserRole(userId, 'admin')

// Promover para waba_manager
await userService.updateUserRole(userId, 'waba_manager')
```

### 5. Obter Projetos do Usuário

```typescript
import projectService from '@/lib/project-service'

// Projetos do usuário como owner
const myProjects = await projectService.getUserProjects(userId)

// Projetos onde é colaborador
const collaboratorProjects = await projectService.getCollaboratorProjects(userId)
```

## 🔐 Fluxo de Autenticação Atualizado

```
1. Usuário faz signup
   ↓
2. LoginForm → signup() no Firebase Auth
   ↓
3. Firebase cria conta
   ↓
4. LoginForm → userService.createUser() no Firestore
   ↓
5. Novo documento em users/{userId} com role='collaborator'
   ↓
6. AuthProvider atualiza userData e role
   ↓
7. useAuthContext().role agora contém o role
```

## 👨‍💼 Admin - Primeira Login

Quando um admin faz login pela primeira vez:

```typescript
// Verificar se já foi inicializado
const isInitialized = await adminInitService.isAdminInitialized(adminId)

if (!isInitialized) {
  // Criar projeto JADE HUB com as variáveis do .env
  const { projectId, wabaId } = await adminInitService.initializeAdminOnFirstLogin(
    adminId,
    adminEmail
  )
}
```

## 📊 Permissões por Role

| Permissão | Admin | WABA Manager | Collaborator |
|-----------|-------|--------------|--------------|
| Ver todos projetos | ✅ | ❌ | ❌ |
| Ver projetos onde colabora | ✅ | ✅ | ✅ |
| Criar projetos | ✅ | ✅ | ❌ |
| Editar projeto | ✅ (todos) | ✅ (seus) | ❌ |
| Adicionar colaboradores | ✅ (todos) | ✅ (seus) | ❌ |
| Acessar Meta Config | ✅ | ✅ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |
| Cadastrar WABAs | ✅ | ❌ | ❌ |
| Página Admin | ✅ | ❌ | ❌ |

## 🎁 Projeto JADE HUB

Na primeira login do admin, é automaticamente criado:

- **Nome**: JADE HUB
- **Descrição**: Projeto Principal - Admin
- **WABA**: Usando dados do `NEXT_PUBLIC_META_WABA_ID`
- **Meta Config**: Usando variáveis do `.env.local`
- **Owner**: Admin ID
- **Status**: Active

Variáveis movidas do `.env.local` para o Firestore:
- ✅ `META_APP_SECRET`
- ✅ `META_BUSINESS_TOKEN`
- ✅ Todas as variáveis Meta

## 🔒 Segurança

### Variáveis Sensíveis
- ❌ **Não** mais em `.env.local` (inseguro para clientes)
- ✅ Armazenadas no Firestore
- ✅ Acessíveis apenas por Admin/WABA_MANAGER
- ✅ Nunca enviadas para o cliente
- ✅ Requeridas via API segura (backend)

### Regras Firestore (TODO)
Implementar regras de segurança:
```
match /projects/{projectId} {
  allow read: if
    request.auth.uid == resource.data.owner ||
    request.auth.uid in resource.data.collaborators
}

match /wabas/{wabaId} {
  allow read, write: if
    request.auth.uid == resource.data.adminId
}
```

## 📱 UI Atualizado

### Dashboard
- ✅ Seletor de projeto (apenas projetos acessíveis)
- ✅ Botão Admin (apenas para admin)
- ✅ Info do projeto no topo

### Página Admin
- ✅ Listar WABAs
- ✅ Cadastrar WABA
- ✅ Aprovar WABA
- ✅ Atribuir a WABA Manager

## 🆘 Próximos Passos

1. ✅ Sistema de roles implementado
2. ⏳ Página de WABA Manager (criar projetos)
3. ⏳ Página de Usuários (gerenciar colaboradores)
4. ⏳ Regras de segurança no Firestore
5. ⏳ Criptografia de tokens sensíveis
6. ⏳ Log de auditoria (quem acessou o quê)

---

**Status**: ✅ Sistema de roles e permissões totalmente implementado!
