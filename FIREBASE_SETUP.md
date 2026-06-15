# Configuração do Firebase ✅

O Firebase foi configurado como banco de dados do projeto!

## 📋 Passos para Completar a Configuração

### 1. Obter as Credenciais do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Criar projeto" ou selecione um existente
3. Vá para **Configurações do Projeto** (ícone de engrenagem)
4. Copie as credenciais da seção "Firebase SDK snippet" (Configuração da Web)
5. Cole as seguintes variáveis no arquivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

### 2. Ativar Serviços do Firebase (Firebase Console)

- **Autenticação**: Firestore > Authentication > Email/Password
- **Firestore Database**: Create database em modo teste (ou produção)
- **Realtime Database** (opcional): Para dados em tempo real
- **Storage** (opcional): Para upload de arquivos

## 🎯 Como Usar

### Autenticação
```typescript
import { useAuth } from '@/lib/use-auth';

export default function LoginPage() {
  const { signIn, signUp, user, isAuthenticated } = useAuth();
  
  const handleLogin = async () => {
    await signIn('email@example.com', 'password');
  };
  
  return isAuthenticated ? <p>Logado!</p> : <button onClick={handleLogin}>Entrar</button>;
}
```

### Firestore (Banco de dados principal)
```typescript
import firestoreService from '@/lib/firestore-service';

// Criar documento
const userId = await firestoreService.addDocument('users', {
  name: 'João',
  email: 'joao@example.com'
});

// Buscar documento
const user = await firestoreService.getDocument('users', userId);

// Atualizar
await firestoreService.updateDocument('users', userId, { name: 'João Silva' });

// Deletar
await firestoreService.deleteDocument('users', userId);

// Listar tudo
const allUsers = await firestoreService.getCollection('users');

// Filtrar
const users = await firestoreService.queryDocuments('users', 'role', '==', 'admin');
```

### Realtime Database (Dados em tempo real)
```typescript
import realtimeService from '@/lib/realtime-service';

// Definir dados
await realtimeService.setData('chats/chat1', {
  message: 'Olá!',
  timestamp: Date.now()
});

// Escutar mudanças em tempo real
const unsubscribe = realtimeService.listenToData('chats/chat1', (data) => {
  console.log('Nova mensagem:', data);
});

// Parar de escutar
unsubscribe();
```

### Storage (Upload de arquivos)
```typescript
import storageService from '@/lib/storage-service';

// Upload
const file = new File(['conteúdo'], 'documento.pdf');
const downloadURL = await storageService.uploadFile('documentos/doc1', file);

// Deletar
await storageService.deleteFile('documentos/doc1');

// Listar arquivos
const files = await storageService.listFiles('documentos/');
```

## 📁 Arquivos Criados

- `src/lib/firebase.ts` - Configuração do Firebase
- `src/lib/firestore-service.ts` - Serviço para Firestore (CRUD)
- `src/lib/realtime-service.ts` - Serviço para Realtime Database
- `src/lib/storage-service.ts` - Serviço para Storage (uploads)
- `src/lib/use-auth.ts` - Hook customizado de autenticação

## 🔒 Variáveis de Ambiente

Todas as variáveis Firebase começam com `NEXT_PUBLIC_`, então são visíveis no cliente (seguro para chaves públicas). Nunca compartilhe as credenciais ou commits!

## 💡 Próximos Passos

1. Preenchea as credenciais do Firebase no `.env.local`
2. Adapte os modelos de dados para sua aplicação
3. Integre os serviços nos seus componentes
4. Configure regras de segurança no Firebase Console (importante!)

---

**Nota**: Este projeto usa Firebase v12 com modular SDK para melhor performance e bundling.
