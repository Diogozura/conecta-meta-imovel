'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthContext } from './auth-context';
import type { UserRole } from './firebase-types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = '/dashboard',
}: RoleGuardProps) {
  const router = useRouter();
  const { role, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && (!role || !allowedRoles.includes(role))) {
      router.push(fallbackPath);
    }
  }, [role, loading, router, allowedRoles, fallbackPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D42026] mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
