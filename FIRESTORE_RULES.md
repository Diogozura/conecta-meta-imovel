# 🔒 Regras de Segurança do Firestore

## ⚠️ URGENTE: Regras para Testes (DESENVOLVIMENTO)

**Use PRIMEIRO estas regras permissivas para testar tudo:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORÁRIO: Permite autenticados fazer tudo
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Como Aplicar:
1. Abra [Firebase Console](https://console.firebase.google.com)
2. Vá em **Firestore → Rules**
3. Delete as regras antigas (que têm `if false`)
4. Cole as regras acima
5. Clique em **Publish**

---

## ✅ Regras para Produção (DEPOIS)

Depois que tudo funcionar, use estas regras restritivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função para verificar autenticação
    function isAuthenticated() {
      return request.auth != null;
    }

    // Função para verificar se é admin (com fallback para segurança)
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', 'collaborator') == 'admin';
    }

    // Função para verificar se é o proprietário
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // ==================== USERS ====================
    match /users/{userId} {
      // Usuário pode ler seu próprio documento
      allow read: if isAuthenticated() && isOwner(userId);
      
      // Usuário pode criar seu próprio documento (signup)
      allow create: if request.auth.uid == userId;
      
      // Usuário pode atualizar seu próprio documento
      allow update: if isAuthenticated() && isOwner(userId);
      
      // Apenas admin pode listar todos os usuários
      allow list: if isAuthenticated() && isAdmin();
    }

    // ==================== PROJECTS ====================
    match /projects/{projectId} {
      // Pode ler projeto se é owner ou collaborator
      allow read: if isAuthenticated() && (
        resource.data.owner == request.auth.uid ||
        request.auth.uid in resource.data.collaborators
      );
      
      // Pode criar projeto qualquer autenticado
      allow create: if isAuthenticated();
      
      // Pode atualizar projeto se é owner
      allow update: if isAuthenticated() && resource.data.owner == request.auth.uid;
      
      // Pode deletar projeto se é owner
      allow delete: if isAuthenticated() && resource.data.owner == request.auth.uid;
      
      // Pode listar projetos (cada um vê seus)
      allow list: if isAuthenticated();
    }

    // ==================== WABAS ====================
    match /wabas/{wabaId} {
      // Apenas admin pode ler WABAs
      allow read: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode criar WABA
      allow create: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode atualizar WABA
      allow update: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode deletar WABA
      allow delete: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode listar WABAs
      allow list: if isAuthenticated() && isAdmin();
    }

    // ==================== CONVERSATIONS ====================
    match /conversations/{conversationId} {
      // Pode ler conversa se é owner ou colaborador do projeto
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.owner == request.auth.uid
      );
      
      // Pode criar conversa qualquer autenticado
      allow create: if isAuthenticated();
      
      // Pode atualizar conversa se é owner
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // ==================== MESSAGES ====================
    match /messages/{messageId} {
      // Pode ler mensagem se é sender ou tem acesso à conversa
      allow read: if isAuthenticated() && (
        resource.data.senderId == request.auth.uid ||
        get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.userId == request.auth.uid
      );
      
      // Pode criar mensagem qualquer autenticado
      allow create: if isAuthenticated();
    }

    // ==================== CATCH-ALL (DENY ALL) ====================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔄 Passo a Passo

### 1️⃣ AGORA - Aplicar Regras de Desenvolvimento
- Cole as regras **PERMISSIVAS** no Firebase
- Clique em **Publish**
- Teste todo o fluxo de signup/login/criar projeto

### 2️⃣ DEPOIS - Após Tudo Funcionar
- Cole as regras de **PRODUÇÃO**
- Clique em **Publish**
- Teste novamente para garantir permissões corretas

---

## 📋 Checklist

- [ ] Remover regras antigas (com `if false`)
- [ ] Aplicar regras de desenvolvimento (permissivas)
- [ ] Testar signup
- [ ] Testar login
- [ ] Testar criar projeto
- [ ] Testar enviar mensagem
- [ ] Depois: Aplicar regras de produção

      allow create: if isAuthenticated();
      
      // Pode atualizar projeto se é owner
      allow update: if isAuthenticated() && resource.data.owner == request.auth.uid;
      
      // Pode deletar projeto se é owner
      allow delete: if isAuthenticated() && resource.data.owner == request.auth.uid;
      
      // Pode listar projetos do usuário
      allow list: if isAuthenticated();
    }

    // ==================== WABAS ====================
    match /wabas/{wabaId} {
      // Apenas admin pode ler WABAs
      allow read: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode criar WABA
      allow create: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode atualizar WABA
      allow update: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode deletar WABA
      allow delete: if isAuthenticated() && isAdmin();
      
      // Apenas admin pode listar WABAs
      allow list: if isAuthenticated() && isAdmin();
    }

    // ==================== CONVERSATIONS ====================
    match /conversations/{conversationId} {
      // Pode ler conversa se é owner ou colaborador do projeto
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.owner == request.auth.uid
      );
      
      // Pode criar conversa
      allow create: if isAuthenticated();
      
      // Pode atualizar conversa se é owner
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // ==================== MESSAGES ====================
    match /messages/{messageId} {
      // Pode ler mensagem se tem acesso à conversa
      allow read: if isAuthenticated() && (
        resource.data.senderId == request.auth.uid ||
        get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.userId == request.auth.uid
      );
      
      // Pode criar mensagem
      allow create: if isAuthenticated();
    }

    // ==================== CATCH-ALL (DENY ALL) ====================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## ⚠️ Variantes por Ambiente

### Desenvolvimento (Permissivo)
Se quiser regras mais permissivas para desenvolvimento:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Produção (Restritivo)
Use as regras acima.

## 🚀 Como Aplicar

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto (`jade-hub-b6c09`)
3. Vá em **Firestore Database** → **Rules**
4. Copie e cole as regras acima
5. Clique em **Publish**

## 🔍 Testando as Regras

Use o **Rules Simulator** no Firebase Console para testar antes de publicar!
