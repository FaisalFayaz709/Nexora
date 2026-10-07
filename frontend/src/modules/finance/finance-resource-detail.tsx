'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiRequest, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { EntityRow } from '@/modules/masters/columns';
import { FinanceCommandPanel } from './finance-command-panel';
// R15 detail marker: customer-invoices supplier-invoices payments detail and audit surfaces.
import type { FinanceResourceConfig } from './finance-resource-config';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function valueAtPath(record: EntityRow, key: string) {
  return record[key];
}

function detailEndpoint(resource: FinanceResourceConfig, recordId: string) {
  return resource.detailSupported ? `${resource.endpoint}/${recordId}` : undefined;
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

export function FinanceResourceDetail({ resource, recordId }: { resource: FinanceResourceConfig; recordId: string }) {
  const endpoint = detailEndpoint(resource, recordId);
  const query = useQuery({
    queryKey: createNexoraQueryKey('finance-detail', resource.key, recordId),
    enabled: Boolean(endpoint),
    queryFn: async () => apiRequest<ApiSingleEnvelope<EntityRow>>(endpoint!, { method: 'GET' }),
  });

  const fallbackRecord = useMemo<EntityRow>(() => ({ id: recordId, status: resource.detailSupported ? 'DETAIL_PENDING' : 'READ_MODEL_OR_COMMAND_ONLY' }), [recordId, resource.detailSupported]);
  const record = query.data?.data ?? fallbackRecord;
  const status = valueAtPath(record, 'status');

  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle.toLowerCase()}`} description="Fetching tenant-scoped finance detail from the Fastify /api/v1 backend." />;
  if (query.error) return <ErrorState title={`Unable to load ${resource.singularTitle.toLowerCase()}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the finance detail request.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatValue(valueAtPath(record, 'invoiceNo') ?? valueAtPath(record, 'paymentNo') ?? valueAtPath(record, 'entryNo') ?? valueAtPath(record, 'code') ?? recordId)}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeof status === 'string' ? <Badge variant="outline">{status}</Badge> : null}
              {resource.editSupported ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit allowed fields</a></Button> : null}
              <Button type="button" variant="outline" asChild><a href={resource.routeBase}>Back to finance list</a></Button>
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
            label: 'Finance profile',
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Finance fields</CardTitle>
                  <CardDescription>Editable fields are separated from command-only invoice posting, supplier matching, payment allocation and journal posting.</CardDescription>
                </CardHeader>
                <CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent>
              </Card>
            ),
          },
          {
            id: 'commands',
            label: 'Commands',
            content: <FinanceCommandPanel resource={resource} recordId={recordId} currentStatus={typeof status === 'string' ? status : 'UNKNOWN'} />,
          },
          {
            id: 'continuity',
            label: 'Continuity',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Related finance evidence</CardTitle><CardDescription>Finance records connect projects, procurement, inventory, tax, bank/cash, audit and reporting.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} />
                    {resource.key === 'supplier-invoices' ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/match`}>Open three-way match</a></Button> : null}
                    {resource.key === 'payments' ? <Button type="button" variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/allocations`}>Open allocations</a></Button> : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Audit, controls and reversal rules</CardTitle><CardDescription>Critical finance workflows require server-side tenant/branch scope, maker-checker and transaction boundaries.</CardDescription></CardHeader>
                  <CardContent>
                    <AuditTimeline items={[
                      { id: 'status', title: 'Allowed status transitions', description: 'Submit, approve, post, send, cancel, match and journal post are explicit command actions where the backend exposes them.' },
                      { id: 'three-way-match', title: 'Three-way match', description: 'Supplier invoice approval must reconcile Purchase Order + Goods Received Note + Supplier Invoice.' },
                      { id: 'idempotency', title: 'Payment idempotency', description: 'Duplicate payment retries must produce one financial effect with allocations and journal state reconciled.' },
                      { id: 'reversal', title: 'Reversal-only correction', description: 'Posted invoices, payments and journals are reversed or cancelled through policy; they are not silently edited/deleted.' },
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
