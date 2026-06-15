// Serviço para operações com Firestore (Banco de dados principal)
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Query,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { firestore } from './firebase';

// Interface genérica para documentos
export interface FirebaseDocument {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

class FirestoreService {
  /**
   * Obter um documento pelo ID
   */
  async getDocument<T extends FirebaseDocument>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as T;
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar documento: ${error}`);
      throw error;
    }
  }

  /**
   * Obter todos os documentos de uma coleção
   */
  async getCollection<T extends FirebaseDocument>(
    collectionName: string,
    constraints?: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const q = constraints
        ? query(collection(firestore, collectionName), ...constraints)
        : collection(firestore, collectionName);
      
      const querySnapshot = await getDocs(q as Query<DocumentData>);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as T)
      );
    } catch (error) {
      console.error(`Erro ao buscar coleção: ${error}`);
      throw error;
    }
  }

  /**
   * Criar um novo documento
   */
  async addDocument<T extends FirebaseDocument>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const docRef = doc(collection(firestore, collectionName));
      const timestamp = new Date();
      await setDoc(docRef, {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return docRef.id;
    } catch (error) {
      console.error(`Erro ao criar documento: ${error}`);
      throw error;
    }
  }

  /**
   * Criar ou substituir um documento com ID conhecido
   */
  async setDocument<T extends FirebaseDocument>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(firestore, collectionName, docId);
      const timestamp = new Date();
      await setDoc(docRef, {
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp,
      });
    } catch (error) {
      console.error(`Erro ao definir documento: ${error}`);
      throw error;
    }
  }

  /**
   * Atualizar um documento
   */
  async updateDocument<T extends FirebaseDocument>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(firestore, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`Erro ao atualizar documento: ${error}`);
      throw error;
    }
  }

  /**
   * Deletar um documento
   */
  async deleteDocument(
    collectionName: string,
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(firestore, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Erro ao deletar documento: ${error}`);
      throw error;
    }
  }

  /**
   * Buscar documentos com filtros
   */
  async queryDocuments<T extends FirebaseDocument>(
    collectionName: string,
    field: string,
    operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'in' | 'array-contains',
    value: any
  ): Promise<T[]> {
    try {
      const q = query(
        collection(firestore, collectionName),
        where(field, operator, value)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as T)
      );
    } catch (error) {
      console.error(`Erro ao consultar documentos: ${error}`);
      throw error;
    }
  }
}

export default new FirestoreService();
