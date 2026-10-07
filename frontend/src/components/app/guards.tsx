'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/modules/auth/auth-provider';
import { ForbiddenState, LoadingState } from '@/components/feedback';

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <LoadingState title="Checking session" description="NEXORA is validating your current login session." />;
  if (!auth.authenticated) return <ForbiddenState title="Authentication required" description="Sign in before opening this NEXORA workspace." />;
  return <>{children}</>;
}

export function TenantGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.organizationId) return <ForbiddenState title="Tenant context required" description="Select an organization before opening tenant-owned ERP data." />;
  return <>{children}</>;
}

export function PortalGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <LoadingState title="Checking portal session" description="NEXORA is resolving the portal identity and tenant scope." />;
  if (!auth.authenticated) return <ForbiddenState title="Portal authentication required" description="Sign in before opening a customer or vendor portal workspace." />;
  if (!auth.organizationId) return <ForbiddenState title="Portal tenant scope required" description="Portal records must resolve through a tenant membership and linked party scope." />;
  return <>{children}</>;
}

export function TechnicianGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <LoadingState title="Checking technician session" description="NEXORA is resolving technician assignment and offline scope." />;
  if (!auth.authenticated) return <ForbiddenState title="Technician authentication required" description="Sign in before opening the technician PWA workspace." />;
  if (!auth.organizationId) return <ForbiddenState title="Technician tenant scope required" description="Technician work orders must remain tenant and branch scoped." />;
  if (!auth.permissions.includes('workorder.view') && !auth.permissions.includes('workorder.update')) {
    return <ForbiddenState title="Technician scope required" description="This PWA surface is restricted to assigned field-service users." />;
  }
  return <>{children}</>;
}

export function PermissionGate({ permission, children, fallback }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const auth = useAuth();
  if (!auth.permissions.includes(permission)) return <>{fallback ?? null}</>;
  return <>{children}</>;
}
