// Exemplo de tipos e funções para armazenar conversas no Firestore
import { FirebaseDocument } from './firestore-service';

/**
 * Interface para documentos de Conversas
 */
export interface Conversation extends FirebaseDocument {
  userId: string;
  clientId: string;
  clientName: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageTime: Date | null;
  unreadCount: number;
  status: 'active' | 'archived' | 'closed';
  tags?: string[];
}

/**
 * Interface para documentos de Mensagens
 */
export interface Message extends FirebaseDocument {
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'client'; // Se foi enviado pelo vendedor ou cliente
  content: string;
  mediaUrl?: string; // URL de imagem/arquivo
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  timestamp: Date;
  read: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'failed';
}

/**
 * Interface para documentos de Clientes
 */
export interface Client extends FirebaseDocument {
  userId: string;
  name: string;
  email?: string;
  phoneNumber: string;
  whatsappNumber?: string;
  company?: string;
  position?: string;
  lastInteraction?: Date;
  notes?: string;
  stage?: 'prospect' | 'interested' | 'negotiating' | 'closed' | 'lost';
}

/**
 * Interface para documentos de Imoveis
 */
export interface Property extends FirebaseDocument {
  userId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  bedrooms: number;
  bathrooms: number;
  area: number; // em m²
  images: string[]; // URLs do Firebase Storage
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

// Exemplo de como usar no seu componente:
/*

import firestoreService from '@/lib/firestore-service';
import type { Conversation, Message, Client } from '@/lib/firebase-types';

// Criar uma nova conversa
const newConversation = await firestoreService.addDocument<Conversation>('conversations', {
  userId: 'user123',
  clientId: 'client456',
  clientName: 'João Silva',
  phoneNumber: '+55 11 98765-4321',
  lastMessage: 'Olá, tem mais informações deste imóvel?',
  lastMessageTime: new Date(),
  unreadCount: 2,
  status: 'active',
  tags: ['vendedor1', 'acompanhamento'],
});

// Buscar conversas de um usuário
const userConversations = await firestoreService.queryDocuments<Conversation>(
  'conversations',
  'userId',
  '==',
  'user123'
);

// Buscar uma conversa específica
const conversation = await firestoreService.getDocument<Conversation>(
  'conversations',
  conversationId
);

// Adicionar mensagem
const newMessage = await firestoreService.addDocument<Message>('messages', {
  conversationId: 'conv123',
  senderId: 'user123',
  senderType: 'user',
  content: 'Sim, vou enviar mais fotos!',
  timestamp: new Date(),
  read: false,
  deliveryStatus: 'sent',
});

// Buscar mensagens de uma conversa
const messages = await firestoreService.queryDocuments<Message>(
  'messages',
  'conversationId',
  '==',
  'conv123'
);

*/
