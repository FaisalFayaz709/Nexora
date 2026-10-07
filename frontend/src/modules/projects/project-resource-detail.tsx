'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { valueAtPath, type EntityRow } from '@/modules/masters/columns';
import { ProjectCommandPanel } from './project-command-panel';
import type { ProjectResourceConfig } from './project-resource-config';

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.name ?? record.code ?? record.projectNo ?? record.id ?? 'object');
  }
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  const uniqueFields = Array.from(new Set(fields));
  if (!uniqueFields.length) return <EmptyState title="No configured fields" description="This detail page has no configured field list yet." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {uniqueFields.map((field) => (
        <div key={field} className="rounded-lg border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</p>
          <p className="mt-1 break-words text-sm text-foreground">{formatValue(valueAtPath(record, field))}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectResourceDetail({ resource, recordId }: { resource: ProjectResourceConfig; recordId: string }) {
  const query = useQuery({
    queryKey: createNexoraQueryKey(resource.key, 'detail', recordId),
    queryFn: () => apiGet<ApiSingleEnvelope<EntityRow>>(`${resource.endpoint}/${recordId}`),
  });

  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle}`} description="Fetching the tenant-scoped project record from Fastify /api/v1." />;
  if (query.error) return <ErrorState title={`Cannot load ${resource.singularTitle}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the project detail request.'} />;
  const record = query.data?.data;
  if (!record || typeof record !== 'object') return <EmptyState title={`${resource.singularTitle} not found`} description="The detail endpoint returned no tenant-visible project record for this id." />;
  const status = valueAtPath(record, 'status');

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatValue(valueAtPath(record, 'projectNo') ?? valueAtPath(record, 'title') ?? valueAtPath(record, 'name') ?? recordId)}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}
              <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button>
              <Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to projects</a></Button>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}/{recordId}</p>
        </CardHeader>
      </Card>

      <Tabs
        defaultId="profile"
        items={[
          { id: 'profile', label: 'Project profile', content: <Card><CardHeader><CardTitle className="text-base">Project fields</CardTitle><CardDescription>Editable fields stay separate from command-only lifecycle transitions.</CardDescription></CardHeader><CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent></Card> },
          { id: 'workflows', label: 'Workflows', content: <ProjectCommandPanel projectId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} /> },
          { id: 'related', label: 'Related lifecycle', content: <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Connected project evidence</CardTitle><CardDescription>Projects connect CRM, procurement, inventory, assets, finance and handover evidence.</CardDescription></CardHeader><CardContent className="space-y-4"><ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} /><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`/projects/${recordId}/bom`}>BOM</a></Button><Button variant="outline" asChild><a href={`/projects/${recordId}/budget`}>Budget</a></Button><Button variant="outline" asChild><a href={`/projects/${recordId}/costing`}>Costing</a></Button><Button variant="outline" asChild><a href={`/projects/${recordId}/timeline`}>Timeline</a></Button></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Audit and transaction controls</CardTitle><CardDescription>Project command effects remain transactional where downstream material, asset or finance state is affected.</CardDescription></CardHeader><CardContent><AuditTimeline items={[{ id: 'tenant', title: 'Tenant/resource scope', description: 'Project reads and commands use organizationId from authenticated context.' }, { id: 'bom', title: 'BOM/version control', description: 'BOM save and approval use dedicated endpoints and audit records.' }, { id: 'material', title: 'Material request', description: 'Material demand is created from approved BOM shortages, not by isolated frontend CRUD.' }, { id: 'handover', title: 'Handover', description: 'Customer acceptance changes project lifecycle through explicit command only.' }]} /></CardContent></Card></div> },
        ]}
      />
    </main>
  );
}
