import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function createAdminApp(): App {
  const existing = getApps().find(a => a.name === 'admin')
  if (existing) return existing

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK não configurado. Preencha FIREBASE_ADMIN_PROJECT_ID, ' +
      'FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no .env.local. ' +
      'Gere a chave em: Firebase Console → Configurações do Projeto → Contas de Serviço.'
    )
  }

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    'admin'
  )
}

// Lazy: só inicializa quando a função for chamada, não no import
export function getAdminDb() {
  return getFirestore(createAdminApp())
}
