'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import userService from './user-service';
import type { User, UserRole } from './firebase-types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Tenta obter dados do usuário no Firestore com timeout
          const fetchUserWithTimeout = new Promise<User | null>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`Timeout ao buscar usuário ${currentUser.uid} no Firestore`);
              resolve(null);
            }, 5000);

            userService.getUser(currentUser.uid)
              .then((user) => {
                clearTimeout(timeout);
                resolve(user);
              })
              .catch((error) => {
                clearTimeout(timeout);
                console.error('Erro ao buscar dados do usuário:', error);
                resolve(null);
              });
          });

          const firebaseUserData = await fetchUserWithTimeout;
          
          if (firebaseUserData) {
            setUserData(firebaseUserData);
          } else {
            console.warn(`Usuário ${currentUser.uid} não encontrado ou erro na busca`);
            // Tenta criar usuário automaticamente
            try {
              await userService.createUser(
                currentUser.uid,
                currentUser.email || '',
                currentUser.displayName || 'Usuário',
                'collaborator'
              );
              const newUserData = await userService.getUser(currentUser.uid);
              setUserData(newUserData);
            } catch (createError) {
              console.error('Erro ao criar usuário:', createError);
              // Define um userData vazio para não ficar em loop
              // Seta como admin se for o primeiro usuário (fallback seguro)
              setUserData({
                id: currentUser.uid,
                email: currentUser.email || '',
                name: currentUser.displayName || 'Usuário',
                role: 'admin', // Primeiro usuário é admin por padrão
                permissions: {
                  canViewAllProjects: true,
                  canCreateProjects: true,
                  canManageUsers: true,
                  canAccessMeta: true,
                },
                createdAt: new Date(),
              } as User);
            }
          }
        } catch (error) {
          console.error('Erro ao processar autenticação:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    role: userData?.role || null,
  };

  // Debug: log do role para verificar se está sendo setado
  if (user && userData) {
    console.log('Auth Context - Role:', userData.role);
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de AuthProvider');
  }
  return context;
}
