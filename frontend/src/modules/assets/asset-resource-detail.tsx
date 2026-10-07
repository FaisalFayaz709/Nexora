'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { valueAtPath, type EntityRow } from '@/modules/masters/columns';
import { AssetCommandPanel } from './asset-command-panel';
import type { AssetResourceConfig } from './asset-resource-config';

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.assetNo ?? record.serialNo ?? record.name ?? record.id ?? 'object');
  }
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from(new Set(fields)).map((field) => <div key={field} className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</p><p className="mt-1 break-words text-sm text-foreground">{formatValue(valueAtPath(record, field))}</p></div>)}</div>;
}

export function AssetResourceDetail({ resource, recordId }: { resource: AssetResourceConfig; recordId: string }) {
  const query = useQuery({ queryKey: createNexoraQueryKey(resource.key, 'detail', recordId), queryFn: () => apiGet<ApiSingleEnvelope<EntityRow>>(`${resource.endpoint}/${recordId}`) });
  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle}`} description="Fetching the tenant-scoped asset record from Fastify /api/v1." />;
  if (query.error) return <ErrorState title={`Cannot load ${resource.singularTitle}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the asset detail request.'} />;
  const record = query.data?.data;
  if (!record || typeof record !== 'object') return <EmptyState title={`${resource.singularTitle} not found`} description="The detail endpoint returned no tenant-visible asset record for this id." />;
  const status = valueAtPath(record, 'status');

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle>{formatValue(valueAtPath(record, 'assetNo') ?? recordId)}</CardTitle><CardDescription>{resource.description}</CardDescription></div>
            <div className="flex flex-wrap gap-2">{typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}<Button type="button" variant="outline" asChild><a href={`/assets/${recordId}/history`}>History</a></Button><Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button><Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to assets</a></Button></div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}/{recordId}</p>
        </CardHeader>
      </Card>
      <Tabs defaultId="profile" items={[
        { id: 'profile', label: 'Asset profile', content: <Card><CardHeader><CardTitle className="text-base">Asset fields</CardTitle><CardDescription>Editable fields are separated from lifecycle command state.</CardDescription></CardHeader><CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent></Card> },
        { id: 'commands', label: 'Lifecycle commands', content: <AssetCommandPanel assetId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} /> },
        { id: 'traceability', label: 'Traceability', content: <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Connected asset evidence</CardTitle><CardDescription>Asset records connect procurement, inventory serials, project installation, customer site, maintenance and finance history.</CardDescription></CardHeader><CardContent className="space-y-4"><ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} /><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`/assets/${recordId}/install`}>Install</a></Button><Button variant="outline" asChild><a href={`/assets/${recordId}/replace`}>Replace</a></Button><Button variant="outline" asChild><a href={`/assets/${recordId}/qr`}>QR</a></Button><Button variant="outline" asChild><a href={`/assets/${recordId}/rma`}>RMA</a></Button></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Audit and lifecycle controls</CardTitle><CardDescription>Critical lifecycle actions must be committed with stock/asset/audit consistency.</CardDescription></CardHeader><CardContent><AuditTimeline items={[{ id: 'serial', title: 'Serialized stock traceability', description: 'Installation prevents serial from remaining available stock.' }, { id: 'qr', title: 'Authorized QR lookup', description: 'QR token alone never bypasses auth, tenant or portal scope.' }, { id: 'history', title: 'Append-only asset history', description: 'Replacement, RMA and retirement preserve historical events instead of overwriting them.' }]} /></CardContent></Card></div> },
      ]} />
    </main>
  );
}
