'use client';

import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiRequest, type ApiListEnvelope } from '@/lib/api-client';
import { createEntityColumns, type EntityRow } from '@/modules/masters/columns';
import type { PortalResourceConfig } from './portal-resource-config';

export function PortalResourcePage({ resource }: { resource: PortalResourceConfig }) {
  const query = useQuery({ queryKey: ['portal-resource', resource.key], queryFn: () => apiRequest<ApiListEnvelope<EntityRow>>(resource.endpoint, { method: 'GET', query: { page: 1, pageSize: 25 } }) });
  const rows = Array.isArray(query.data?.data) ? query.data?.data as EntityRow[] : [];
  const columns = createEntityColumns([...resource.columns]);
  return (
    <main className="space-y-6">
      <Card><CardHeader><CardTitle>{resource.title}</CardTitle><CardDescription>{resource.description}</CardDescription></CardHeader><CardContent><p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}</p><p className="mt-2 text-sm text-muted-foreground">Portal scope: linked {resource.linkedScope}. The PortalShell portal shell prevents internal ERP navigation and Fastify enforces tenant/resource authorization.</p></CardContent></Card>
      <DataTable<EntityRow, unknown> columns={columns} data={rows} loading={query.isLoading} error={query.error instanceof Error ? query.error.message : undefined} emptyTitle={`No ${resource.title.toLowerCase()} found`} emptyDescription="No linked portal records were returned for the authenticated portal identity." />
      <section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Allowed portal actions</CardTitle></CardHeader><CardContent><ActivityTimeline items={resource.actions.map((action) => ({ id: action, title: action, description: 'Action must be backed by a Fastify portal endpoint and linked-record authorization.' }))} /></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Portal audit and isolation</CardTitle></CardHeader><CardContent><AuditTimeline items={[{ id: 'linked-scope', title: 'Linked-record scope', description: `Only records linked to the authenticated ${resource.linkedScope} identity are visible.` }, { id: 'tenant', title: 'Tenant isolation', description: 'organizationId comes from session/membership, never from request body.' }, { id: 'documents', title: 'Document authorization', description: 'Portal document downloads require backend authorization and short-lived URLs.' }]} /></CardContent></Card></section>
    </main>
  );
}
