'use client';

import { useAuthContext } from './auth-context';
import type { UserRole } from './firebase-types';

type PermissionKey = 'canViewAllProjects' | 'canCreateProjects' | 'canManageUsers' | 'canAccessMeta';

export function useRole() {
  const { role, userData } = useAuthContext();

  return {
    role,
    isAdmin: role === 'admin',
    isWabaManager: role === 'waba_manager',
    isCollaborator: role === 'collaborator',
    hasPermission: (permission: PermissionKey) => {
      if (!userData) return false;
      return userData.permissions[permission] ?? false;
    },
    can: {
      viewAllProjects: userData?.permissions.canViewAllProjects ?? false,
      createProjects: userData?.permissions.canCreateProjects ?? false,
      manageUsers: userData?.permissions.canManageUsers ?? false,
      accessMeta: userData?.permissions.canAccessMeta ?? false,
    },
  };
}
