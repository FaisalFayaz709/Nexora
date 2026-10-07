'use client';

import { useQuery } from '@tanstack/react-query';

import { PermissionGate } from '@/components/app';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import type { BusinessMasterConfig, BusinessMasterRelatedPanel } from './business-master-config';
import { valueAtPath, type EntityRow } from './columns';

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = record.name ?? record.title ?? record.code ?? record.id;
    if (preferred !== undefined && preferred !== null) return String(preferred);
  }
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  const visibleFields = fields.filter((field) => valueAtPath(record, field) !== undefined || ['createdAt', 'updatedAt'].includes(field));
  if (!visibleFields.length) {
    return <EmptyState title="No detail fields returned" description="The backend response did not include the configured fields for this tenant-visible record." />;
  }
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

function RelatedPanel({ panel, recordId }: { panel: BusinessMasterRelatedPanel; recordId: string }) {
  const resolvedEndpoint = panel.endpoint?.replace(':id', recordId);
  const relatedQuery = useQuery({
    queryKey: createNexoraQueryKey('business-master-related', resolvedEndpoint ?? panel.title, recordId),
    queryFn: () => apiGet<ApiSingleEnvelope<unknown>>(resolvedEndpoint ?? ''),
    enabled: Boolean(resolvedEndpoint),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{panel.title}</CardTitle>
        <CardDescription>{panel.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolvedEndpoint ? <p className="font-mono text-xs text-muted-foreground">Fastify source: {resolvedEndpoint}</p> : null}
        {relatedQuery.isLoading ? <LoadingState title="Loading related evidence" description="Fetching the permission-filtered related panel." /> : null}
        {relatedQuery.error ? <ErrorState title="Related panel unavailable" description={relatedQuery.error instanceof Error ? relatedQuery.error.message : 'The backend rejected this related read.'} /> : null}
        {relatedQuery.data ? (
          <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{JSON.stringify(relatedQuery.data.data ?? relatedQuery.data, null, 2)}</pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BusinessMasterDetail({ resource, recordId }: { resource: BusinessMasterConfig; recordId: string }) {
  const detailQuery = useQuery({
    queryKey: createNexoraQueryKey('business-master-detail', resource.key, recordId),
    queryFn: () => apiGet<ApiSingleEnvelope<EntityRow>>(`${resource.endpoint}/${recordId}`),
  });

  if (detailQuery.isLoading) return <LoadingState title={`Loading ${resource.singularTitle}`} description="Fetching the latest tenant-scoped record from Fastify /api/v1." />;
  if (detailQuery.error) return <ErrorState title={`Cannot load ${resource.singularTitle}`} description={detailQuery.error instanceof Error ? detailQuery.error.message : 'The backend rejected the detail request.'} />;

  const record = detailQuery.data?.data;
  if (!record || typeof record !== 'object') return <EmptyState title={`${resource.singularTitle} not found`} description="The detail endpoint returned no tenant-visible record for this id." />;
  const status = valueAtPath(record, 'status');

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatValue(valueAtPath(record, 'name') ?? valueAtPath(record, 'code') ?? valueAtPath(record, 'employeeNo') ?? valueAtPath(record, 'sku') ?? recordId)}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}
              <PermissionGate permission={resource.updatePermission}>
                <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button>
              </PermissionGate>
              <Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to list</a></Button>
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
            label: 'Profile',
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile fields</CardTitle>
                  <CardDescription>Editable master-data fields returned by the owning Fastify endpoint. Status changes remain command-controlled where the backend defines a state model.</CardDescription>
                </CardHeader>
                <CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent>
              </Card>
            ),
          },
          {
            id: 'related',
            label: 'Related records',
            content: <div className="grid gap-4 lg:grid-cols-2">{resource.relatedPanels.map((panel) => <RelatedPanel key={panel.title} panel={panel} recordId={recordId} />)}</div>,
          },
          {
            id: 'audit',
            label: 'Audit and documents',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Documents</CardTitle><CardDescription>Documents are linked through the Document module and MinIO StorageService, not directly from the frontend.</CardDescription></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Expected evidence: profile files, contracts, certifications, tax documents, address proof, import source batch and versioned document links where applicable.</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Audit trail</CardTitle><CardDescription>Backend audit logs are the source of truth for create, update, import and sensitive status changes.</CardDescription></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Expected evidence: actor, action, before/after summary, request id, tenant, branch/resource scope and timestamp.</p></CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
