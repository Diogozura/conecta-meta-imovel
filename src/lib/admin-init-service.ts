// Serviço para inicializar dados do admin (projeto JADE HUB)
import firestoreService from './firestore-service';
import projectService from './project-service';
import type { Project, Waba, MetaConfig } from './firebase-types';

class AdminInitService {
  /**
   * Inicializar dados do admin - cria projeto JADE HUB e WABA
   */
  async initializeAdminOnFirstLogin(
    adminId: string,
    adminEmail: string
  ): Promise<{ projectId: string; wabaId: string }> {
    try {
      // 1. Criar WABA para JADE HUB
      const wabaId = await projectService.createWaba({
        wabaId: process.env.NEXT_PUBLIC_META_WABA_ID || '1492759332552105',
        phoneNumberId: process.env.NEXT_PUBLIC_META_PHONE_NUMBER_ID || '',
        businessToken: process.env.NEXT_PUBLIC_META_BUSINESS_TOKEN || '',
        clientName: 'JADE HUB - Admin',
        adminId,
        status: 'active',
      } as Waba);

      // 2. Criar Meta Config
      const metaConfig = {
        APP_ID: process.env.NEXT_PUBLIC_META_APP_ID || '3284612488390244',
        APP_SECRET: process.env.META_APP_SECRET,
        GRAPH_API_VERSION: process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION || 'v21.0',
        EMBEDDED_SIGNUP_CONFIG_ID:
          process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || '',
        WEBHOOK_VERIFY_TOKEN:
          process.env.META_WEBHOOK_VERIFY_TOKEN || '',
      };

      // 3. Criar Projeto JADE HUB
      const projectId = await projectService.createProject({
        name: 'JADE HUB',
        description: 'Projeto Principal - Admin',
        owner: adminId,
        wabaId,
        collaborators: [adminId],
        metaConfig: {
          APP_ID: metaConfig.APP_ID,
          GRAPH_API_VERSION: metaConfig.GRAPH_API_VERSION,
          EMBEDDED_SIGNUP_CONFIG_ID: metaConfig.EMBEDDED_SIGNUP_CONFIG_ID,
          WEBHOOK_VERIFY_TOKEN: metaConfig.WEBHOOK_VERIFY_TOKEN,
        },
        waba: {
          WABA_ID: process.env.NEXT_PUBLIC_META_WABA_ID || '1492759332552105',
          PHONE_NUMBER_ID: process.env.NEXT_PUBLIC_META_PHONE_NUMBER_ID,
          BUSINESS_TOKEN: process.env.NEXT_PUBLIC_META_BUSINESS_TOKEN,
        },
        status: 'active',
      } as Project);

      console.log('Admin inicializado com sucesso:', { projectId, wabaId });
      return { projectId, wabaId };
    } catch (error) {
      console.error('Erro ao inicializar admin:', error);
      throw error;
    }
  }

  /**
   * Verificar se admin já foi inicializado
   */
  async isAdminInitialized(adminId: string): Promise<boolean> {
    try {
      const projects = await firestoreService.queryDocuments(
        'projects',
        'owner',
        '==',
        adminId
      );
      return projects.length > 0;
    } catch {
      return false;
    }
  }
}

export default new AdminInitService();
