'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/modules/auth/auth-provider';

type PermissionContextValue = {
  permissions: readonly string[];
  hasPermission(permission: string): boolean;
  hasAnyPermission(permissions: readonly string[]): boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionContextProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions: auth.permissions,
      hasPermission(permission: string) {
        return auth.permissions.includes(permission);
      },
      hasAnyPermission(permissions: readonly string[]) {
        return permissions.some((permission) => auth.permissions.includes(permission));
      },
    }),
    [auth.permissions],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext() {
  const value = useContext(PermissionContext);
  if (!value) throw new Error('PermissionContextProvider missing');
  return value;
}
