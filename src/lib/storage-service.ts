// Serviço para operações com Firebase Storage (Armazenamento de arquivos)
import {
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  listAll,
} from 'firebase/storage';
import { storage } from './firebase';

class StorageService {
  /**
   * Fazer upload de um arquivo
   */
  async uploadFile(
    path: string,
    file: File | Blob
  ): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error(`Erro ao fazer upload: ${error}`);
      throw error;
    }
  }

  /**
   * Deletar um arquivo
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (error) {
      console.error(`Erro ao deletar arquivo: ${error}`);
      throw error;
    }
  }

  /**
   * Obter URL de download de um arquivo
   */
  async getDownloadURL(path: string): Promise<string> {
    try {
      const fileRef = ref(storage, path);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error(`Erro ao obter URL de download: ${error}`);
      throw error;
    }
  }

  /**
   * Listar arquivos em um diretório
   */
  async listFiles(path: string): Promise<string[]> {
    try {
      const dirRef = ref(storage, path);
      const result = await listAll(dirRef);
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item))
      );
      return urls;
    } catch (error) {
      console.error(`Erro ao listar arquivos: ${error}`);
      throw error;
    }
  }
}

export default new StorageService();
