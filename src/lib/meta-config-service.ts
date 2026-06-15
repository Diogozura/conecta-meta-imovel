// Serviço para buscar dados Meta e WABA do Firestore
import firestoreService from './firestore-service';
import type { Project } from './firebase-types';

class MetaConfigService {
  /**
   * Obter configurações Meta e WABA de um projeto
   */
  async getProjectMetaConfig(projectId: string): Promise<{
    metaConfig: Project['metaConfig'] | undefined;
    wabaConfig: Project['waba'] | undefined;
  }> {
    try {
      const project = await firestoreService.getDocument<Project>('projects', projectId);

      if (!project) {
        throw new Error('Projeto não encontrado');
      }

      return {
        metaConfig: project.metaConfig,
        wabaConfig: project.waba,
      };
    } catch (error) {
      console.error('Erro ao buscar configurações Meta:', error);
      throw error;
    }
  }

  /**
   * Obter apenas Meta Config
   */
  async getMetaConfig(projectId: string) {
    const { metaConfig } = await this.getProjectMetaConfig(projectId);
    return metaConfig;
  }

  /**
   * Obter apenas WABA Config
   */
  async getWabaConfig(projectId: string) {
    const { wabaConfig } = await this.getProjectMetaConfig(projectId);
    return wabaConfig;
  }

  /**
   * Verificar se projeto tem Meta Config completo
   */
  async isMetaConfigured(projectId: string): Promise<boolean> {
    try {
      const { metaConfig, wabaConfig } = await this.getProjectMetaConfig(projectId);
      return !!(
        metaConfig?.APP_ID &&
        metaConfig?.GRAPH_API_VERSION &&
        wabaConfig?.WABA_ID &&
        wabaConfig?.PHONE_NUMBER_ID &&
        wabaConfig?.BUSINESS_TOKEN
      );
    } catch {
      return false;
    }
  }
}

export default new MetaConfigService();
