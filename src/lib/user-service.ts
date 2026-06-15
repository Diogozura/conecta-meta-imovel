// Serviço para gerenciar usuários e roles
import firestoreService from './firestore-service';
import type { User, UserRole } from './firebase-types';

class UserService {
  /**
   * Criar usuário no Firestore (chamado após signup no Firebase Auth)
   */
  async createUser(
    userId: string,
    email: string,
    name: string,
    role: UserRole = 'collaborator'
  ): Promise<void> {
    const permissions = this.getPermissionsForRole(role);

    await firestoreService.setDocument<User>('users', userId, {
      id: userId,
      email,
      name,
      role,
      permissions,
      createdAt: new Date(),
    } as User);
  }

  /**
   * Obter usuário
   */
  async getUser(userId: string): Promise<User | null> {
    return firestoreService.getDocument<User>('users', userId);
  }

  /**
   * Obter todos os usuários
   */
  async getAllUsers(): Promise<User[]> {
    try {
      console.log('getAllUsers - Iniciando query...')
      const snapshot = await firestoreService.queryDocuments<User>('users', 'role', '!=', '');
      console.log('getAllUsers - Usuários encontrados:', snapshot.length)
      return snapshot;
    } catch (error) {
      console.error('getAllUsers - Erro ao buscar todos os usuários:', error)
      // Se não conseguir consultar com !=, retorna vazio e assume que é novo usuário
      return [];
    }
  }

  /**
   * Atualizar role do usuário
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const permissions = this.getPermissionsForRole(newRole);
    await firestoreService.updateDocument<User>('users', userId, {
      role: newRole,
      permissions,
    });
  }

  /**
   * Atribuir WABAs a um WABA Manager
   */
  async assignWabasToManager(userId: string, wabaIds: string[]): Promise<void> {
    await firestoreService.updateDocument<User>('users', userId, {
      assignedWabas: wabaIds,
    });
  }

  /**
   * Obter permissões baseadas no role
   */
  private getPermissionsForRole(role: UserRole) {
    switch (role) {
      case 'admin':
        return {
          canViewAllProjects: true,
          canCreateProjects: true,
          canManageUsers: true,
          canAccessMeta: true,
        };
      case 'waba_manager':
        return {
          canViewAllProjects: false,
          canCreateProjects: true,
          canManageUsers: false,
          canAccessMeta: true,
        };
      case 'collaborator':
      default:
        return {
          canViewAllProjects: false,
          canCreateProjects: false,
          canManageUsers: false,
          canAccessMeta: false,
        };
    }
  }
}

export default new UserService();
