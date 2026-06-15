// Serviço para operações com Firebase Realtime Database
import {
  ref,
  set,
  get,
  remove,
  onValue,
  update,
  Unsubscribe,
} from 'firebase/database';
import { database } from './firebase';

interface RealtimeData {
  [key: string]: any;
}

class RealtimeDatabaseService {
  /**
   * Definir dados em um caminho
   */
  async setData(path: string, data: RealtimeData): Promise<void> {
    try {
      const dbRef = ref(database, path);
      await set(dbRef, data);
    } catch (error) {
      console.error(`Erro ao definir dados: ${error}`);
      throw error;
    }
  }

  /**
   * Obter dados de um caminho
   */
  async getData(path: string): Promise<RealtimeData | null> {
    try {
      const dbRef = ref(database, path);
      const snapshot = await get(dbRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Erro ao obter dados: ${error}`);
      throw error;
    }
  }

  /**
   * Atualizar dados em um caminho
   */
  async updateData(path: string, data: RealtimeData): Promise<void> {
    try {
      const dbRef = ref(database, path);
      await update(dbRef, data);
    } catch (error) {
      console.error(`Erro ao atualizar dados: ${error}`);
      throw error;
    }
  }

  /**
   * Deletar dados de um caminho
   */
  async deleteData(path: string): Promise<void> {
    try {
      const dbRef = ref(database, path);
      await remove(dbRef);
    } catch (error) {
      console.error(`Erro ao deletar dados: ${error}`);
      throw error;
    }
  }

  /**
   * Escutar mudanças em tempo real
   * Retorna uma função para desinscrever
   */
  listenToData(
    path: string,
    callback: (data: RealtimeData | null) => void
  ): Unsubscribe {
    const dbRef = ref(database, path);
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      callback(data);
    });
  }
}

export default new RealtimeDatabaseService();
