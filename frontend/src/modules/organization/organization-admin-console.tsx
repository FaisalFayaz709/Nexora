'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { createNexoraQueryKey } from '@/lib/query-client';
import { EntityList } from '@/modules/masters/entity-list';
import { useAuth } from '@/modules/auth/auth-provider';
import { organizationApi } from './api';

type MembershipRow = {
  id: string;
  organizationId: string;
  branchId?: string | null;
  status: string;
};

type OrganizationSettingRow = {
  key: string;
  value: string;
  source: string;
};

function TenantSwitcherReadModel() {
  const auth = useAuth();
  const rows = auth.memberships.map((membership) => ({
    ...membership,
    selected: membership.organizationId === auth.organizationId ? 'Selected' : 'Available',
  }));

  const columns = useMemo<ColumnDef<MembershipRow & { selected: string }>[]>(
    () => [
      { id: 'organizationId', header: 'Organization', accessorKey: 'organizationId', cell: ({ row }) => <span className="font-mono text-xs">{row.original.organizationId}</span> },
      { id: 'branchId', header: 'Branch scope', accessorKey: 'branchId', cell: ({ row }) => <span className="font-mono text-xs">{row.original.branchId ?? 'Tenant-wide'}</span> },
      { id: 'status', header: 'Membership status', accessorKey: 'status', cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'default' : 'outline'}>{row.original.status}</Badge> },
      { id: 'selected', header: 'Current', accessorKey: 'selected', cell: ({ row }) => <Badge variant="secondary">{row.original.selected}</Badge> },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Tenant and branch context</h2>
        <p className="mt-1 text-sm text-muted-foreground">The selected organization is carried by the centralized API client header and is never trusted from form bodies as authorization context.</p>
      </div>
      <DataTable columns={columns} data={rows} emptyTitle="No memberships" emptyDescription="A tenant membership must be resolved before authenticated ERP screens can load." />
    </section>
  );
}

function OrganizationSettingsScreen() {
  const featuresQuery = useQuery({
    queryKey: createNexoraQueryKey('organization', 'settings', 'features'),
    queryFn: () => organizationApi.features.list({ page: 1, pageSize: 100 }),
  });

  const rows = useMemo<OrganizationSettingRow[]>(() => {
    const data = featuresQuery.data?.data as unknown;
    if (data && typeof data === 'object') {
      const record = data as { features?: unknown[]; modules?: unknown[] };
      return [
        { key: 'enabledFeatures', value: String(record.features?.length ?? 0), source: 'GET /api/v1/features' },
        { key: 'moduleConfigurations', value: String(record.modules?.length ?? 0), source: 'GET /api/v1/features' },
        { key: 'tenantIsolation', value: 'backend-enforced organizationId', source: 'AuthGuard + TenantGuard + Fastify service scope' },
      ];
    }
    return [
      { key: 'currency', value: 'Configured by organization settings', source: 'OrganizationSetting entity' },
      { key: 'timezone', value: 'Configured by organization settings', source: 'OrganizationSetting entity' },
      { key: 'locale', value: 'Configured by organization settings', source: 'OrganizationSetting entity' },
      { key: 'moduleConfiguration', value: 'Feature flags and module configuration are managed through platform endpoints', source: 'Feature/module configuration' },
    ];
  }, [featuresQuery.data]);

  const columns = useMemo<ColumnDef<OrganizationSettingRow>[]>(
    () => [
      { id: 'key', header: 'Setting', accessorKey: 'key', cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span> },
      { id: 'value', header: 'Value', accessorKey: 'value' },
      { id: 'source', header: 'Source', accessorKey: 'source' },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Organization settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Settings are tenant-owned, audited and applied through backend services rather than one-off frontend constants.</p>
      </div>
      <DataTable columns={columns} data={rows} loading={featuresQuery.isLoading} error={featuresQuery.error instanceof Error ? featuresQuery.error.message : undefined} />
    </section>
  );
}

function OrganizationSummaryCards() {
  const auth = useAuth();
  const active = auth.memberships.filter((membership) => membership.status === 'ACTIVE');
  const branchScoped = active.filter((membership) => membership.branchId).length;
  const items = [
    { title: 'Tenant memberships', value: String(active.length), description: 'Active memberships usable by TenantGuard.' },
    { title: 'Branch-scoped memberships', value: String(branchScoped), description: 'Branch ownership narrows operational screens.' },
    { title: 'Organization permission', value: auth.permissions.includes('organization.manage') ? 'Manage' : 'View/limited', description: 'UI actions are gated by shared permission keys.' },
    { title: 'Feature controls', value: auth.permissions.includes('feature.manage') ? 'Configurable' : 'Read only', description: 'Disabled modules must be hidden in UI and blocked by API/services.' },
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
            <p className="text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BranchesScreen() {
  return (
    <EntityList
      title="Branches"
      endpoint="/branches"
      description="Operating branches are tenant-scoped and branch-scoped users only see their authorized branch. Create/edit forms use shared Zod organization contracts."
      columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'addressId', label: 'Address' }, { key: 'status', label: 'Status' }]}
      createLabel="Create branch"
    />
  );
}

export function DepartmentsScreen() {
  return (
    <EntityList
      title="Departments"
      endpoint="/departments"
      description="Departments belong to branches; backend services inject organizationId and enforce branch/resource scope."
      columns={[{ key: 'name', label: 'Department' }, { key: 'branchId', label: 'Branch' }, { key: 'managerEmployeeId', label: 'Manager' }, { key: 'status', label: 'Status' }]}
      createLabel="Create department"
    />
  );
}

export function TeamsScreen() {
  return (
    <EntityList
      title="Teams"
      endpoint="/teams"
      description="Team grouping is organization/department owned and used for project/service assignment without bypassing employee membership scope."
      columns={[{ key: 'name', label: 'Team' }, { key: 'departmentId', label: 'Department' }, { key: 'leadEmployeeId', label: 'Lead' }, { key: 'memberCount', label: 'Members' }]}
      createLabel="Create team"
    />
  );
}

export function NumberSequencesScreen() {
  return (
    <EntityList
      title="Number Sequences"
      endpoint="/number-sequences"
      description="Configure PR, PO, GRN, INV, AST, TKT and work-order business numbers per tenant/branch/year. Number issuing remains transaction-safe inside backend services."
      columns={[{ key: 'entityType', label: 'Entity type' }, { key: 'prefix', label: 'Prefix' }, { key: 'fiscalYear', label: 'Fiscal year' }, { key: 'currentNumber', label: 'Current number' }, { key: 'resetPolicy', label: 'Reset policy' }]}
      createLabel="Create sequence"
    />
  );
}

export function FeatureConfigurationScreen() {
  return (
    <EntityList
      title="Features & Module Configuration"
      endpoint="/features"
      description="Feature flags and module configuration are permission-aware; disabled modules are hidden in navigation and still blocked at API/service level."
      columns={[{ key: 'key', label: 'Feature' }, { key: 'moduleKey', label: 'Module' }, { key: 'enabled', label: 'Enabled' }, { key: 'defaultEnabled', label: 'Default' }]}
      createLabel="Configure feature"
    />
  );
}

export function OrganizationSettingsPageSurface() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Organization Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Tenant settings, feature controls and module configuration are managed as auditable platform records.</p>
      </div>
      <OrganizationSettingsScreen />
    </section>
  );
}

export function OrganizationAdminConsole() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Organization Administration</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-600">
          Pass R9 completes branches, departments, teams, organization settings, number sequences and module-feature configuration as tenant-aware frontend surfaces.
        </p>
      </div>
      <OrganizationSummaryCards />
      <Tabs
        defaultId="context"
        items={[
          { id: 'context', label: 'Tenant context', content: <TenantSwitcherReadModel /> },
          { id: 'branches', label: 'Branches', content: <BranchesScreen /> },
          { id: 'departments', label: 'Departments', content: <DepartmentsScreen /> },
          { id: 'teams', label: 'Teams', content: <TeamsScreen /> },
          { id: 'settings', label: 'Settings', content: <OrganizationSettingsScreen /> },
          { id: 'sequences', label: 'Number sequences', content: <NumberSequencesScreen /> },
          { id: 'features', label: 'Features', content: <FeatureConfigurationScreen /> },
        ]}
      />
    </section>
  );
}
