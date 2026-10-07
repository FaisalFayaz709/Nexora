'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiRequest, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { EntityRow } from '@/modules/masters/columns';
import type { PlatformResourceConfig } from './platform-resource-config';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function DetailGrid({ record, fields }: { record: EntityRow; fields: readonly string[] }) {
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from(new Set(fields)).map((field) => <div key={field} className="rounded-md border bg-muted/20 p-3"><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field}</dt><dd className="mt-1 break-words text-sm font-medium text-foreground">{formatValue(record[field])}</dd></div>)}</dl>;
}

export function PlatformResourceDetail({ resource, recordId }: { resource: PlatformResourceConfig; recordId: string }) {
  const endpoint = `${resource.endpoint}/${recordId}`;
  const query = useQuery({ queryKey: createNexoraQueryKey('platform-detail', resource.key, recordId), queryFn: async () => apiRequest<ApiSingleEnvelope<EntityRow>>(endpoint, { method: 'GET' }), enabled: resource.detailSupported });
  const fallback = useMemo<EntityRow>(() => ({ id: recordId, status: resource.detailSupported ? 'DETAIL_PENDING' : 'READ_MODEL_ONLY' }), [recordId, resource.detailSupported]);
  const record = query.data?.data ?? fallback;
  const status = typeof record.status === 'string' ? record.status : undefined;

  if (query.isLoading) return <LoadingState title={`Loading ${resource.singularTitle.toLowerCase()}`} description="Fetching permission-filtered platform detail from Fastify /api/v1." />;
  if (query.error) return <ErrorState title={`Unable to load ${resource.singularTitle.toLowerCase()}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the platform detail request.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle>{formatValue(record.fileName ?? record.name ?? record.title ?? record.action ?? record.id ?? recordId)}</CardTitle><CardDescription>{resource.description}</CardDescription></div>
            <div className="flex flex-wrap gap-2">{status ? <Badge variant="outline">{status}</Badge> : null}{resource.editSupported ? <Button variant="outline" asChild><a href={`${resource.routeBase}/${recordId}/edit`}>Edit allowed fields</a></Button> : null}<Button variant="outline" asChild><a href={resource.routeBase}>Back</a></Button></div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint}</p>
        </CardHeader>
      </Card>
      <Tabs defaultId="profile" items={[
        { id: 'profile', label: 'Profile', content: <Card><CardHeader><CardTitle className="text-base">Platform fields</CardTitle><CardDescription>Editable platform fields are separated from command-only upload, export, communication, notification and SaaS actions.</CardDescription></CardHeader><CardContent><DetailGrid record={record} fields={[...resource.identityFields, ...resource.profileFields]} /></CardContent></Card> },
        { id: 'continuity', label: 'Continuity', content: <Card><CardHeader><CardTitle className="text-base">Related evidence</CardTitle><CardDescription>Platform records support documents, reports, communications, notifications, audit, portals and SaaS lifecycle traceability.</CardDescription></CardHeader><CardContent><ActivityTimeline items={resource.relatedPanels.map((panel, index) => ({ id: `${panel.title}-${index}`, title: panel.title, description: panel.description }))} /></CardContent></Card> },
        { id: 'audit', label: 'Audit and scope', content: <Card><CardHeader><CardTitle className="text-base">Controls</CardTitle><CardDescription>All platform reads and commands are tenant, permission and branch/resource scoped by the Fastify backend.</CardDescription></CardHeader><CardContent><AuditTimeline items={[{ id: 'tenant', title: 'Tenant isolation', description: 'Frontend cannot override organizationId; backend injects tenant context.' }, { id: 'rbac', title: 'RBAC scope', description: 'Reports/search/calendar cannot show resources the user cannot access in source modules.' }, { id: 'storage', title: 'Storage boundary', description: 'Documents use StorageService and presigned URLs; no MinIO secrets are exposed.' }, { id: 'audit', title: 'Auditability', description: 'High-risk platform, feature, communication and export changes create audit evidence.' }]} /></CardContent></Card> },
      ]} />
    </main>
  );
}
