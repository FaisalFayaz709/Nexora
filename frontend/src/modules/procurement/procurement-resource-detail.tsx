'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiRequest, type ApiListEnvelope, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { EntityRow } from '@/modules/masters/columns';
import { ProcurementCommandPanel } from './procurement-command-panel';
import type { ProcurementResourceConfig } from './procurement-resource-config';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function valueAtPath(record: EntityRow, key: string) {
  return record[key];
}

function detailEndpoint(resource: ProcurementResourceConfig, recordId: string) {
  return resource.detailEndpointTemplate?.replace(':id', recordId);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from(new Set(fields)).map((field) => (
        <div key={field} className="rounded-md border bg-muted/20 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-foreground">{formatValue(valueAtPath(record, field))}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProcurementResourceDetail({ resource, recordId }: { resource: ProcurementResourceConfig; recordId: string }) {
  const endpoint = detailEndpoint(resource, recordId);
  const query = useQuery({
    queryKey: createNexoraQueryKey('procurement-detail', resource.key, recordId),
    enabled: Boolean(endpoint),
    queryFn: async () => apiRequest<ApiSingleEnvelope<EntityRow>>(endpoint!, { method: 'GET' }),
  });

  const fallbackRecord = useMemo<EntityRow>(() => ({ id: recordId, status: resource.endpointMode === 'create-only' ? 'WORKFLOW_CONTEXT' : 'DETAIL_READ_MODEL_PENDING' }), [recordId, resource.endpointMode]);
  const record = query.data?.data ?? fallbackRecord;
  const status = valueAtPath(record, 'status');

  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle.toLowerCase()}`} description="Fetching tenant-scoped detail from the Fastify /api/v1 backend." />;
  if (query.error) return <ErrorState title={`Unable to load ${resource.singularTitle.toLowerCase()}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the detail request.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatValue(valueAtPath(record, 'prNo') ?? valueAtPath(record, 'rfqNo') ?? valueAtPath(record, 'quoteRef') ?? valueAtPath(record, 'poNo') ?? valueAtPath(record, 'grnNo') ?? valueAtPath(record, 'contractNo') ?? recordId)}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}
              {resource.endpointMode === 'crud' ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit</a></Button> : null}
              <Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to procurement</a></Button>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint ?? resource.endpoint}</p>
        </CardHeader>
      </Card>

      <Tabs
        defaultId="profile"
        items={[
          {
            id: 'profile',
            label: 'Procurement profile',
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Procurement fields</CardTitle>
                  <CardDescription>Editable fields are separated from command-only status transitions and downstream inventory/finance effects.</CardDescription>
                </CardHeader>
                <CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent>
              </Card>
            ),
          },
          {
            id: 'commands',
            label: 'Commands',
            content: <ProcurementCommandPanel resource={resource} recordId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} />,
          },
          {
            id: 'continuity',
            label: 'Continuity',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Related procurement evidence</CardTitle><CardDescription>Procurement is not isolated CRUD; it links material demand, approvals, vendor sourcing, inventory receipt and finance matching.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} />
                    {resource.key === 'rfqs' ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/comparison`}>Open RFQ comparison</a></Button> : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Audit, controls and three-way match</CardTitle><CardDescription>Critical procurement workflows require server-side tenant/branch scope, maker-checker and transaction boundaries.</CardDescription></CardHeader>
                  <CardContent>
                    <AuditTimeline items={[
                      { id: 'state', title: 'Allowed status transitions', description: 'Submit, approve, reject, publish, select, send, receive, inspect and post are explicit commands.' },
                      { id: 'vendor-risk', title: 'Vendor governance', description: 'Unapproved or blacklisted vendors are blocked from RFQ, PO and payment workflows.' },
                      { id: 'grn-stock', title: 'GRN inventory transaction', description: 'Receiving commits GRN items, PO received quantities, serial/batch movement, stock ledger and audit together.' },
                      { id: 'three-way-match', title: 'Finance matching', description: 'Supplier invoice approval must reconcile Purchase Order + Goods Received Note + Supplier Invoice.' },
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
