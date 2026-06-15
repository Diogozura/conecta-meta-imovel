'use client'

import { auth } from './firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

/**
 * Fazer login com email e senha
 */
export async function login(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Criar nova conta com email e senha
 */
export async function signup(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Fazer logout
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}
