import { FirebaseDocument } from './firestore-service';

/**
 * Tipos de roles no sistema
 */
export type UserRole = 'admin' | 'waba_manager' | 'collaborator';

/**
 * Interface para usuários
 */
export interface User extends FirebaseDocument {
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: {
    canViewAllProjects: boolean;
    canCreateProjects: boolean;
    canManageUsers: boolean;
    canAccessMeta: boolean;
  };
  assignedWabas?: string[]; // IDs de WABAs atribuídas ao WABA_MANAGER
  createdAt: Date;
}

/**
 * Interface para Configuração Meta (variáveis de conexão)
 */
export interface MetaConfig extends FirebaseDocument {
  APP_ID: string;
  APP_SECRET?: string; // Apenas para admin
  GRAPH_API_VERSION: string;
  EMBEDDED_SIGNUP_CONFIG_ID: string;
  WEBHOOK_VERIFY_TOKEN: string;
}

/**
 * Interface para WABA (WhatsApp Business Account)
 */
export interface Waba extends FirebaseDocument {
  wabaId: string;
  phoneNumberId?: string;
  businessToken?: string; // Criptografado
  clientName: string;
  adminId: string; // ID do admin que cadastrou
  wabaManagerId?: string; // ID do WABA manager atribuído
  status: 'pending' | 'approved' | 'rejected' | 'active';
  createdAt: Date;
  approvedAt?: Date;
}

/**
 * Interface para Projeto
 */
export interface Project extends FirebaseDocument {
  name: string;
  description?: string;
  owner: string; // ID do usuário admin ou waba_manager
  wabaId: string; // ID da WABA associada
  collaborators: string[]; // IDs dos usuários colaboradores
  metaConfig?: {
    APP_ID: string;
    GRAPH_API_VERSION: string;
    EMBEDDED_SIGNUP_CONFIG_ID: string;
    WEBHOOK_VERIFY_TOKEN: string;
  };
  waba?: {
    WABA_ID: string;
    PHONE_NUMBER_ID?: string;
    BUSINESS_TOKEN?: string; // Criptografado
  };
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para Conversa
 */
export interface Conversation extends FirebaseDocument {
  projectId: string;
  userId: string;
  clientId: string;
  clientName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  lastMessage: string;
  lastMessageTime: Date | null;
  unreadCount: number;
  status: 'active' | 'archived' | 'closed';
  tags?: string[];
}

/**
 * Interface para Mensagem
 */
export interface Message extends FirebaseDocument {
  projectId: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'client';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  timestamp: Date;
  read: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'failed';
}

/**
 * Interface para Cliente
 */
export interface Client extends FirebaseDocument {
  projectId: string;
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
 * Interface para Imóvel
 */
export interface Property extends FirebaseDocument {
  projectId: string;
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
  area: number;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
