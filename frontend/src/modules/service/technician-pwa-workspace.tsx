'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { TechnicianOfflineSyncBatchSchema } from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, MakerCheckerNotice } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import { EntityList } from '@/modules/masters/entity-list';

const technicianColumns = [
  { key: 'workOrderNo', label: 'Work Order' },
  { key: 'ticketId', label: 'Ticket' },
  { key: 'assetId', label: 'Asset' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'scheduledAt', label: 'Scheduled' },
];

const offlineCommandFields: ResourceFormField[] = [
  { name: 'clientCommandId', label: 'Client command id', type: 'text', required: true },
  { name: 'workOrderId', label: 'Work order id', type: 'text', required: true },
  { name: 'technicianEmployeeId', label: 'Technician employee id', type: 'text', description: 'Optional consistency check only. Backend resolves technician identity from the authenticated session.' },
  { name: 'type', label: 'Command type', type: 'select', required: true, options: [
    { label: 'Accept', value: 'ACCEPT' },
    { label: 'Start travel', value: 'START_TRAVEL' },
    { label: 'Arrive', value: 'ARRIVE' },
    { label: 'Status change', value: 'STATUS_CHANGE' },
    { label: 'Check in', value: 'CHECK_IN' },
    { label: 'Location', value: 'LOCATION' },
    { label: 'Start work', value: 'START_WORK' },
    { label: 'Add photo', value: 'ADD_PHOTO' },
    { label: 'Use part', value: 'USE_PART' },
    { label: 'Signature', value: 'SIGNATURE' },
    { label: 'Service report', value: 'SERVICE_REPORT' },
    { label: 'Check out', value: 'CHECK_OUT' },
    { label: 'Complete', value: 'COMPLETE' },
  ] },
  { name: 'occurredAt', label: 'Occurred at', type: 'text', required: true },
  { name: 'payload', label: 'Payload JSON', type: 'json', description: 'Command-specific payload such as nextStatus, serviceReportId, document ids, parts, checklist or visit proof.' },
];

function offlineSyncDefinition(): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: 'technician-offline-sync',
    title: 'Synchronize offline technician commands',
    description: 'POST /api/v1/portal/technician/offline-sync replays technician PWA commands with tenant, branch, assigned technician, idempotency and conflict checks.',
    endpoint: '/portal/technician/offline-sync',
    schema: TechnicianOfflineSyncBatchSchema as z.ZodType<Record<string, unknown>>,
    defaultValues: { deviceId: 'technician-device', clientBatchId: '', tenantClockAt: '', commands: [] },
    fields: [
      { name: 'deviceId', label: 'Device id', type: 'text', required: true },
      { name: 'clientBatchId', label: 'Client batch id', type: 'text', required: true },
      { name: 'tenantClockAt', label: 'Tenant clock at', type: 'text', required: true },
      { name: 'commands', label: 'Offline command queue', type: 'array', minItems: 1, description: 'Controlled RHF field array matching the IndexedDB queue shape: clientCommandId, workOrderId, type, occurredAt and payload.', emptyItem: { clientCommandId: '', workOrderId: '', technicianEmployeeId: '', type: 'STATUS_CHANGE', occurredAt: '', payload: {} }, arrayFields: offlineCommandFields },
    ],
    invalidateKeys: [createNexoraQueryKey('technician-pwa', 'jobs'), createNexoraQueryKey('technician-pwa', 'offline-queue')],
    idempotent: true,
    currentStatus: 'OFFLINE_QUEUE_READY',
    requiredPermission: 'workorder.update',
    irreversibleEffects: [
      'Accepted commands may change work-order status, service report state, parts consumption and asset history.',
      'Backend rejects wrong tenant, wrong technician, stale commands and conflicting payload replays.',
      'Files/photos/signatures should be existing Document ids, not large raw offline blobs.',
    ],
  };
}

function PwaPolicyCard({ title, body }: { title: string; body: string }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{body}</p></CardContent></Card>;
}

export function TechnicianPwaWorkspace({ surface = 'jobs' }: { surface?: 'jobs' | 'work-order' | 'service-report' | 'parts' | 'scan' | 'offline-queue' | 'sync-status'; workOrderId?: string }) {
  const [syncOpen, setSyncOpen] = useState(surface === 'sync-status');
  const syncDefinition = useMemo(() => offlineSyncDefinition(), []);
  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Technician PWA workspace</CardTitle>
          <CardDescription>Mobile-first technician surfaces for assigned jobs, QR scanning, service evidence, parts usage, offline queue and sync status.</CardDescription>
        </CardHeader>
        <CardContent>
          <MakerCheckerNotice>Technician PWA actions are authenticated, tenant scoped and assigned-technician scoped. Offline commands replay through Fastify /api/v1 and never bypass backend authorization.</MakerCheckerNotice>
        </CardContent>
      </Card>
      <Tabs
        defaultId={surface === 'sync-status' ? 'sync' : surface === 'offline-queue' ? 'offline' : 'jobs'}
        items={[
          { id: 'jobs', label: 'My jobs', content: <EntityList title="My Technician Jobs" endpoint="/portal/technician/jobs" description="Assigned work orders visible to the authenticated technician. Backend filters by technician, tenant and branch." columns={technicianColumns} detailRouteBase="/technician-pwa/work-orders" /> },
          { id: 'offline', label: 'Offline queue', content: <div className="grid gap-4 lg:grid-cols-2"><PwaPolicyCard title="Offline queue" body="The PWA stores work-order commands, checklist updates, photos/signature document references, parts usage and service-report payloads until connectivity returns." /><PwaPolicyCard title="Conflict handling" body="The backend rejects stale commands, wrong technician scope and conflicting payload replays while returning accepted, replayed and rejected command ids." /></div> },
          { id: 'sync', label: 'Sync status', content: <div className="space-y-4"><PwaPolicyCard title="POST /api/v1/portal/technician/offline-sync" body="This is the only approved backend route for offline technician replay. The frontend must use clientBatchId/clientCommandId and idempotency semantics." /><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setSyncOpen(true)}>Open offline sync command</button></div> },
          { id: 'evidence', label: 'Evidence', content: <ActivityTimeline items={[{ id: 'qr', title: 'Scan Asset QR', description: 'QR token resolution must still require authorization.' }, { id: 'photo', title: 'Add Photos', description: 'Photos use document upload intent/complete-upload before sync references document ids.' }, { id: 'parts', title: 'Use Spare Part', description: 'Parts usage becomes backend stock ledger entries.' }, { id: 'signature', title: 'Customer Signature', description: 'Signature document id is attached to the service report/work-order evidence.' }]} /> },
        ]}
      />
      <CommandFormDialog open={syncOpen} onOpenChange={setSyncOpen} definition={syncDefinition} />
    </main>
  );
}
