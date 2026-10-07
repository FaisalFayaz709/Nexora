'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { valueAtPath, type EntityRow } from '@/modules/masters/columns';
import { MaintenanceCommandPanel } from './maintenance-command-panel';
import type { MaintenanceResourceConfig } from './maintenance-resource-config';

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') return String((value as Record<string, unknown>).name ?? (value as Record<string, unknown>).id ?? 'object');
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from(new Set(fields)).map((field) => <div key={field} className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</p><p className="mt-1 break-words text-sm text-foreground">{formatValue(valueAtPath(record, field))}</p></div>)}</div>;
}

export function MaintenanceResourceDetail({ resource, recordId }: { resource: MaintenanceResourceConfig; recordId: string }) {
  const query = useQuery({
    queryKey: createNexoraQueryKey('maintenance-detail', resource.key, recordId),
    queryFn: () => apiGet<ApiSingleEnvelope<EntityRow>>(`${resource.endpoint}/${recordId}`),
  });
  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle}`} description="Fetching maintenance data from Fastify /api/v1 with tenant scope." />;
  if (query.error) return <ErrorState title={`Cannot load ${resource.singularTitle}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the maintenance detail request.'} />;
  const record = query.data?.data;
  if (!record || typeof record !== 'object') return <EmptyState title={`${resource.singularTitle} not found`} description="No tenant-visible maintenance record was returned." />;
  const status = valueAtPath(record, 'status') ?? valueAtPath(record, 'active');

  return (
    <main className="space-y-6">
      <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{formatValue(valueAtPath(record, 'name') ?? valueAtPath(record, 'dueAt') ?? recordId)}</CardTitle><CardDescription>{resource.description}</CardDescription></div><div className="flex flex-wrap gap-2">{typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}{resource.updatePermission ? <Button variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button> : null}<Button variant="outline" asChild><a href={resource.routeBase}>Back</a></Button></div></div><p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}/{recordId}</p></CardHeader></Card>
      <Tabs defaultId="profile" items={[
        { id: 'profile', label: 'Maintenance profile', content: <Card><CardHeader><CardTitle className="text-base">Fields</CardTitle><CardDescription>Plan/schedule fields are separated from command-only generation and completion.</CardDescription></CardHeader><CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent></Card> },
        { id: 'commands', label: 'Commands', content: <MaintenanceCommandPanel commands={resource.commands} resource={resource} recordId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} /> },
        { id: 'traceability', label: 'Traceability', content: <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Lifecycle handoffs</CardTitle><CardDescription>Maintenance joins asset lifecycle, field service and warranty/RMA workflows.</CardDescription></CardHeader><CardContent><ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} /></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Audit controls</CardTitle><CardDescription>Maintenance mutations must stay transactional where asset/stock/work-order state changes.</CardDescription></CardHeader><CardContent><AuditTimeline items={[{ id: 'schedule', title: 'Schedule generation', description: 'One work order per due schedule through idempotent backend command.' }, { id: 'execution', title: 'Execution completion', description: 'Result, parts, next due date and asset history are backend-authoritative.' }, { id: 'rma', title: 'Warranty/RMA review', description: 'Failed/replaced results keep a traceable asset review path.' }]} /></CardContent></Card></div> },
      ]} />
    </main>
  );
}
