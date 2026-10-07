'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { AuditTimeline, ActivityTimeline } from '@/components/workflow';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { valueAtPath, type EntityRow } from '@/modules/masters/columns';
import { InventoryCommandPanel } from './inventory-command-panel';
import type { InventoryResourceConfig } from './inventory-resource-config';

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.name ?? record.code ?? record.sku ?? record.serialNo ?? record.id ?? 'object');
  }
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  const visibleFields = fields.filter((field) => valueAtPath(record, field) !== undefined || ['createdAt', 'updatedAt'].includes(field));
  if (!visibleFields.length) return <EmptyState title="No detail fields returned" description="The backend response did not include the configured inventory fields for this tenant-visible record." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visibleFields.map((field) => (
        <div key={field} className="rounded-lg border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</p>
          <p className="mt-1 break-words text-sm text-foreground">{formatValue(valueAtPath(record, field))}</p>
        </div>
      ))}
    </div>
  );
}

export function InventoryResourceDetail({ resource, recordId }: { resource: InventoryResourceConfig; recordId: string }) {
  const hasDetailEndpoint = resource.endpointMode === 'crud' || resource.key === 'stock-counts';
  const detailQuery = useQuery({
    queryKey: createNexoraQueryKey('inventory-detail', resource.key, recordId),
    queryFn: () => apiGet<ApiSingleEnvelope<EntityRow>>(`${resource.endpoint}/${recordId}`),
    enabled: hasDetailEndpoint,
  });

  if (!hasDetailEndpoint) {
    return (
      <main className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{resource.singularTitle} workflow</CardTitle>
            <CardDescription>{resource.description}</CardDescription>
            <p className="font-mono text-xs text-muted-foreground">Command/read-only resource id: {recordId}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">The locked backend API does not expose a generic detail GET for this workflow resource. R11 still provides the command panel and keeps state changes on explicit Fastify endpoints only.</p>
          </CardContent>
        </Card>
        <InventoryCommandPanel resource={resource} recordId={recordId} />
      </main>
    );
  }

  if (detailQuery.isLoading) return <LoadingState title={`Loading ${resource.singularTitle}`} description="Fetching the tenant-scoped inventory record from Fastify /api/v1." />;
  if (detailQuery.error) return <ErrorState title={`Cannot load ${resource.singularTitle}`} description={detailQuery.error instanceof Error ? detailQuery.error.message : 'The backend rejected the inventory detail request.'} />;
  const record = detailQuery.data?.data;
  if (!record || typeof record !== 'object') return <EmptyState title={`${resource.singularTitle} not found`} description="The detail endpoint returned no tenant-visible inventory record for this id." />;
  const status = valueAtPath(record, 'status');

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatValue(valueAtPath(record, 'name') ?? valueAtPath(record, 'code') ?? valueAtPath(record, 'sku') ?? valueAtPath(record, 'serialNo') ?? recordId)}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}
              {resource.endpointMode === 'crud' ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button> : null}
              <Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to inventory</a></Button>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}/{recordId}</p>
        </CardHeader>
      </Card>

      <Tabs
        defaultId="profile"
        items={[
          {
            id: 'profile',
            label: 'Inventory profile',
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inventory fields</CardTitle>
                  <CardDescription>Editable master fields are separated from command-only stock status and balance changes.</CardDescription>
                </CardHeader>
                <CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent>
              </Card>
            ),
          },
          {
            id: 'commands',
            label: 'Commands',
            content: <InventoryCommandPanel resource={resource} recordId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} />,
          },
          {
            id: 'traceability',
            label: 'Traceability',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Related inventory evidence</CardTitle><CardDescription>Movement evidence is not duplicated; it is linked by product, warehouse, reference and ledger records.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Audit and ledger controls</CardTitle><CardDescription>Critical inventory mutations must create audit records and immutable ledger lines in backend transactions.</CardDescription></CardHeader>
                  <CardContent>
                    <AuditTimeline items={[
                      { id: 'tenant-scope', title: 'Tenant and branch scope', description: 'organizationId/branchId are resolved from auth context, never trusted from the browser.' },
                      { id: 'transaction', title: 'Atomic inventory transaction', description: 'Reservations, transfers, adjustments and stock-count posting require immediate consistency.' },
                      { id: 'reversal', title: 'No destructive ledger edits', description: 'Corrections happen through adjustment/reversal records, not silent edits.' },
                    ]} />
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
