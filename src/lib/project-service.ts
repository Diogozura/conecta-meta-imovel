// Serviço para gerenciar projetos e WABAs
import firestoreService from './firestore-service';
import type { Project, Waba, User } from './firebase-types';

class ProjectService {
  /**
   * Criar um novo projeto
   */
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return firestoreService.addDocument<Project>('projects', {
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Project);
  }

  /**
   * Obter projeto por ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    return firestoreService.getDocument<Project>('projects', projectId);
  }

  /**
   * Obter todos os projetos de um usuário
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    return firestoreService.queryDocuments<Project>('projects', 'owner', '==', userId);
  }

  /**
   * Obter projetos onde usuário é colaborador
   */
  async getCollaboratorProjects(userId: string): Promise<Project[]> {
    return firestoreService.queryDocuments<Project>(
      'projects',
      'collaborators',
      'array-contains',
      userId
    );
  }

  /**
   * Atualizar projeto
   */
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    await firestoreService.updateDocument<Project>('projects', projectId, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Adicionar colaborador ao projeto
   */
  async addCollaborator(projectId: string, userId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (project) {
      const updatedCollaborators = [...new Set([...project.collaborators, userId])];
      await this.updateProject(projectId, {
        collaborators: updatedCollaborators,
      });
    }
  }

  /**
   * Remover colaborador do projeto
   */
  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (project) {
      const updatedCollaborators = project.collaborators.filter((id) => id !== userId);
      await this.updateProject(projectId, {
        collaborators: updatedCollaborators,
      });
    }
  }

  /**
   * Criar WABA
   */
  async createWaba(wabaData: Omit<Waba, 'id' | 'createdAt'>): Promise<string> {
    return firestoreService.addDocument<Waba>('wabas', {
      ...wabaData,
      createdAt: new Date(),
    } as Waba);
  }

  /**
   * Obter WABA por ID
   */
  async getWaba(wabaId: string): Promise<Waba | null> {
    return firestoreService.getDocument<Waba>('wabas', wabaId);
  }

  /**
   * Obter todas as WABAs de um admin
   */
  async getAdminWabas(adminId: string): Promise<Waba[]> {
    return firestoreService.queryDocuments<Waba>('wabas', 'adminId', '==', adminId);
  }

  /**
   * Atualizar status da WABA
   */
  async updateWabaStatus(
    wabaId: string,
    status: 'pending' | 'approved' | 'rejected' | 'active'
  ): Promise<void> {
    await firestoreService.updateDocument<Waba>('wabas', wabaId, {
      status,
      ...(status === 'approved' && { approvedAt: new Date() }),
    });
  }

  /**
   * Atribuir WABA a um WABA Manager
   */
  async assignWabaToManager(wabaId: string, managerId: string): Promise<void> {
    await firestoreService.updateDocument<Waba>('wabas', wabaId, {
      wabaManagerId: managerId,
    });
  }
}

export default new ProjectService();
