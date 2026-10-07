'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { PERMISSION_KEYS } from '@nexora/shared';

import { DataTable } from '@/components/data';
import { EmptyState } from '@/components/feedback';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { StatusBadge } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import { EntityList } from '@/modules/masters/entity-list';
import { useAuth } from '@/modules/auth/auth-provider';
import { listPermissions, listSessions, rolesApi } from './api';

type RoleRow = {
  id: string;
  name: string;
  systemRole?: boolean;
  mfaRequired?: boolean;
  permissionKeys?: string[];
};

type PermissionMatrixRow = {
  permission: string;
  domain: string;
  assignedRoles: string;
};

function domainOf(permission: string) {
  return permission.split('.')[0] ?? 'platform';
}

function normalizeRoles(value: unknown): RoleRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RoleRow => Boolean(item) && typeof item === 'object' && 'name' in item && 'id' in item);
}

function IdentitySummaryCards() {
  const auth = useAuth();
  const permissionDomains = new Set(auth.permissions.map(domainOf));
  const activeMemberships = auth.memberships.filter((item) => item.status === 'ACTIVE').length;

  const items = [
    { title: 'Active tenant', value: auth.organizationId ?? 'No tenant selected', description: 'Resolved from authenticated membership, not request body.' },
    { title: 'Active memberships', value: String(activeMemberships), description: 'Only ACTIVE memberships are selectable in the tenant switcher.' },
    { title: 'Permission keys', value: String(auth.permissions.length), description: 'UI gates are advisory; Fastify services remain authoritative.' },
    { title: 'Permission domains', value: String(permissionDomains.size), description: 'Role coverage is grouped by canonical permission domain.' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="break-words text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RolePermissionMatrix() {
  const rolesQuery = useQuery({
    queryKey: createNexoraQueryKey('identity', 'roles', 'permission-matrix'),
    queryFn: () => rolesApi.list({ page: 1, pageSize: 100 }),
  });

  const roles = normalizeRoles(rolesQuery.data?.data);
  const rows = useMemo<PermissionMatrixRow[]>(
    () =>
      [...PERMISSION_KEYS].map((permission) => {
        const assigned = roles
          .filter((role) => role.permissionKeys?.includes(permission))
          .map((role) => role.name)
          .sort();
        return {
          permission,
          domain: domainOf(permission),
          assignedRoles: assigned.length ? assigned.join(', ') : 'Not assigned in visible roles',
        };
      }),
    [roles],
  );

  const columns = useMemo<ColumnDef<PermissionMatrixRow>[]>(
    () => [
      { id: 'permission', header: 'Permission key', accessorKey: 'permission', enableSorting: true, cell: ({ row }) => <span className="font-mono text-xs">{row.original.permission}</span> },
      { id: 'domain', header: 'Domain', accessorKey: 'domain', enableSorting: true, cell: ({ row }) => <Badge variant="outline">{row.original.domain}</Badge> },
      { id: 'assignedRoles', header: 'Visible roles with access', accessorKey: 'assignedRoles', enableSorting: false, cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.assignedRoles}</span> },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Role-permission matrix</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Canonical permission keys are rendered from the shared package; role membership comes from the Fastify identity API and remains tenant-scoped.
        </p>
      </div>
      <DataTable<PermissionMatrixRow, unknown>
        columns={columns}
        data={rows}
        loading={rolesQuery.isLoading}
        error={rolesQuery.error instanceof Error ? rolesQuery.error.message : undefined}
        emptyTitle="No permission keys available"
        emptyDescription="The shared permission catalog must be exported before RBAC screens can render."
      />
    </section>
  );
}

function PermissionCatalog() {
  const permissionsQuery = useQuery({
    queryKey: createNexoraQueryKey('identity', 'permissions'),
    queryFn: () => listPermissions({ page: 1, pageSize: 100 }),
  });

  const backendRows = Array.isArray((permissionsQuery.data as { data?: unknown })?.data) ? ((permissionsQuery.data as { data: unknown[] }).data) : [];
  const rows = backendRows.length
    ? backendRows.map((row) => row as Record<string, unknown>)
    : [...PERMISSION_KEYS].map((key) => ({ key, domain: domainOf(key), source: 'shared permission catalog' }));

  return (
    <EntityList
      title="Permissions"
      endpoint="/permissions"
      description={`Canonical RBAC permissions. Shared catalog currently exposes ${PERMISSION_KEYS.length} permission keys; backend list is tenant/role scoped when available.`}
      columns={[{ key: 'key', label: 'Permission key' }, { key: 'domain', label: 'Domain' }, { key: 'description', label: 'Description' }, { key: 'source', label: 'Source' }]}
      createLabel="Permissions are seeded"
      initialFilters={{ pageSize: rows.length ? Math.min(rows.length, 100) : 25 }}
    />
  );
}

function SessionHistoryPanel() {
  const sessionsQuery = useQuery({
    queryKey: createNexoraQueryKey('identity', 'sessions', 'admin-panel'),
    queryFn: () => listSessions({ page: 1, pageSize: 25 }),
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Session history and revocation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions remain server-side and revocable; the UI never exposes refresh hashes, MFA secrets or internal credential material.
        </p>
      </div>
      {sessionsQuery.isError ? <EmptyState title="Session endpoint unavailable" description={(sessionsQuery.error as Error).message} /> : null}
      <EntityList
        title="Active Sessions"
        endpoint="/auth/sessions"
        description="Authenticated users can review and revoke their active server-side sessions. Administrators can audit session surfaces through identity/user management permissions."
        columns={[{ key: 'id', label: 'Session ID' }, { key: 'device', label: 'Device' }, { key: 'ip', label: 'IP' }, { key: 'expiresAt', label: 'Expires' }, { key: 'revokedAt', label: 'Revoked' }]}
        createLabel="No manual session create"
      />
    </section>
  );
}

export function TenantUsersScreen() {
  return (
    <EntityList
      title="Tenant Users"
      endpoint="/users"
      description="Create, edit and suspend tenant users through React Hook Form/Zod dialogs while backend services enforce tenant, branch, password policy, role and audit rules."
      columns={[{ key: 'email', label: 'Email' }, { key: 'status', label: 'Status' }, { key: 'branchId', label: 'Branch' }, { key: 'membershipStatus', label: 'Membership' }, { key: 'lastLoginAt', label: 'Last login' }]}
      createLabel="Create user"
    />
  );
}

export function RolesScreen() {
  return (
    <EntityList
      title="Roles"
      endpoint="/roles"
      description="Manage tenant roles and MFA requirement. Permission replacement remains explicit, audited and backed by shared permission keys."
      columns={[{ key: 'name', label: 'Role name' }, { key: 'systemRole', label: 'System role' }, { key: 'mfaRequired', label: 'MFA required' }, { key: 'permissionKeys.length', label: 'Permissions' }]}
      createLabel="Create role"
    />
  );
}

export function IdentityAdminConsole() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Identity, Organization and RBAC</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-600">
          Pass R9 completes the core administration surface: users, sessions, roles, permissions, role-permission matrix and tenant-aware access controls without moving business logic into the frontend.
        </p>
      </div>
      <IdentitySummaryCards />
      <Tabs
        defaultId="users"
        items={[
          { id: 'users', label: 'Users', content: <TenantUsersScreen /> },
          { id: 'roles', label: 'Roles', content: <RolesScreen /> },
          { id: 'matrix', label: 'Permission matrix', content: <RolePermissionMatrix /> },
          { id: 'permissions', label: 'Permission catalog', content: <PermissionCatalog /> },
          { id: 'sessions', label: 'Sessions', content: <SessionHistoryPanel /> },
        ]}
      />
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        <StatusBadge status="R9_SOURCE_LEVEL" />
        <span className="ml-2">Frontend permission gates are UX controls only; Fastify authorization, tenant isolation, branch scope, maker-checker and audit remain authoritative.</span>
      </div>
    </section>
  );
}

export function PermissionMatrixScreen() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Role-Permission Matrix</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Review canonical permission coverage across visible tenant roles.</p>
      </div>
      <RolePermissionMatrix />
    </section>
  );
}
