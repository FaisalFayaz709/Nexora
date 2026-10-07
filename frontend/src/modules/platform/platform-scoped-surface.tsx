'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { CommandFormDialog, type CommandFormDefinition } from '@/components/forms';
import { DataTable } from '@/components/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiRequest, type ApiListEnvelope } from '@/lib/api-client';
import { createEntityColumns, type EntityRow } from '@/modules/masters/columns';
import { getPlatformResourceConfig, PlatformCompletionPrinciples, type PlatformResourceKey } from './platform-resource-config';

export type PlatformScopedSurfaceKind =
  | 'document-upload' | 'document-download' | 'document-versions' | 'report-exports' | 'report-execution'
  | 'communication-send' | 'communication-delivery' | 'notification-read' | 'notifications-read-all'
  | 'global-search' | 'calendar' | 'saas-usage' | 'feature-configuration';

const surfaceCopy: Record<PlatformScopedSurfaceKind, { title: string; description: string; endpoint: string; resource: PlatformResourceKey; command?: string }> = {
  'document-upload': { title: 'Document Upload Flow', description: 'Upload intent and complete-upload preserve StorageService and MinIO boundaries.', endpoint: '/documents', resource: 'documents', command: 'document-upload-intent' },
  'document-download': { title: 'Document Download Authorization', description: 'Download URLs are short-lived and authorized by Fastify.', endpoint: '/documents', resource: 'documents', command: 'document-download-url' },
  'document-versions': { title: 'Document Versions', description: 'Version uploads append DocumentVersion instead of overwriting evidence.', endpoint: '/documents', resource: 'documents', command: 'document-version' },
  'report-exports': { title: 'Report Exports', description: 'Exports create async worker jobs and generated Document links.', endpoint: '/reports/exports', resource: 'reports', command: 'report-export' },
  'report-execution': { title: 'Report Execution Detail', description: 'Execution detail surfaces worker status, failure reason and export document.', endpoint: '/report-executions', resource: 'report-executions' },
  'communication-send': { title: 'Send Communication', description: 'Communication sends log delivery evidence and queue outbox work after commit.', endpoint: '/communications', resource: 'communications', command: 'send-communication' },
  'communication-delivery': { title: 'Communication Delivery', description: 'Delivery detail exposes status without revealing provider secrets.', endpoint: '/communications', resource: 'communications' },
  'notification-read': { title: 'Mark Notification Read', description: 'Read command is current-user scoped and idempotent.', endpoint: '/notifications', resource: 'notifications', command: 'notification-read' },
  'notifications-read-all': { title: 'Mark All Notifications Read', description: 'Bulk notification update remains current-user and tenant scoped.', endpoint: '/notifications', resource: 'notifications', command: 'notifications-read-all' },
  'global-search': { title: 'Global Search', description: 'Search is permission-filtered and bounded.', endpoint: '/search', resource: 'search' },
  calendar: { title: 'Unified Calendar', description: 'Calendar aggregates source module dates without mutating source records.', endpoint: '/calendar', resource: 'calendar' },
  'saas-usage': { title: 'SaaS Usage Metrics', description: 'Usage supports tenant billing and plan enforcement.', endpoint: '/saas/usage', resource: 'saas-usage' },
  'feature-configuration': { title: 'Feature and Module Configuration', description: 'Disabled modules are hidden in UI and blocked at API/service level.', endpoint: '/features', resource: 'features', command: 'toggle-feature' },
};

export function PlatformScopedSurface({ kind, recordId }: { kind: PlatformScopedSurfaceKind; recordId?: string }) {
  const surface = surfaceCopy[kind];
  const resource = getPlatformResourceConfig(surface.resource);
  const endpoint = recordId && (kind.includes('delivery') || kind.includes('execution')) ? `${surface.endpoint}/${recordId}` : surface.endpoint;
  const query = useQuery({ queryKey: ['platform-surface', kind, recordId], queryFn: () => apiRequest<ApiListEnvelope<EntityRow>>(endpoint, { method: 'GET', query: { page: 1, pageSize: 10 } }) });
  const rows = Array.isArray(query.data?.data) ? query.data?.data as EntityRow[] : [];
  const columns = createEntityColumns([...resource.columns]);
  const command = surface.command ? resource.commands.find((item) => item.key === surface.command) : undefined;
  const definition: CommandFormDefinition<Record<string, unknown>> | undefined = command ? {
    commandKey: command.key,
    title: command.label,
    description: `${command.label}. React Hook Form, Zod and Fastify /api/v1 keep this command tenant scoped, audited and retry safe where required.`,
    endpoint: command.endpointTemplate.replace(':id', recordId ?? ''),
    schema: z.object({ comment: z.string().optional() }),
    defaultValues: { comment: '' },
    fields: [],
    invalidateKeys: [['platform-surface', kind]],
    idempotent: command.idempotent,
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  } : undefined;

  return (
    <main className="space-y-6">
      <Card><CardHeader><CardTitle>{surface.title}</CardTitle><CardDescription>{surface.description}</CardDescription></CardHeader><CardContent><p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint}</p></CardContent></Card>
      {definition ? <CommandFormDialog open onOpenChange={() => undefined} definition={definition} /> : null}
      <Card><CardHeader><CardTitle className="text-base">Permission-filtered read model</CardTitle><CardDescription>Uses the central API client and TanStack Table/DataTable wrapper. No raw fetch, no Next.js business API and no direct persistence.</CardDescription></CardHeader><CardContent><DataTable<EntityRow, unknown> columns={columns} data={rows} loading={query.isLoading} error={query.error instanceof Error ? query.error.message : undefined} emptyTitle={`No ${surface.title.toLowerCase()} records`} emptyDescription="No tenant-visible platform records were returned for this source view." /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Locked controls</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">{PlatformCompletionPrinciples.map((item) => <li key={item} className="rounded-md border p-3">{item}</li>)}</ul></CardContent></Card>
    </main>
  );
}
