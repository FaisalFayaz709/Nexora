'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';

const lists = [
  ['Documents', '/documents?page=1&pageSize=10'],
  ['Unread notifications', '/notifications?unreadOnly=true&page=1&pageSize=10'],
  ['Communication log', '/communications?page=1&pageSize=10'],
] as const;

const commands = [
  ['Request document upload intent', '/documents/upload-intent', 'Creates presigned upload intent through StorageService only.'],
  ['Complete document upload', '/documents/complete-upload', 'Registers Document, DocumentVersion, DocumentLink, audit and event.'],
  ['Mark notification read', '/notifications/{notificationId}/read', 'Updates read state only for current tenant user.'],
  ['Mark all notifications read', '/notifications/read-all', 'Bulk read action scoped to current user.'],
  ['Send communication', '/communications/send', 'Writes communication log, delivery evidence, document attachment refs and EmailOutbox row.'],
] as const;

function DataPanel({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['documents-notifications', endpoint], queryFn: () => apiRequest<any>(endpoint) });
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Source: {endpoint}</p>
      <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function DocumentsNotificationsWorkbench() {
  const qc = useQueryClient();
  const [notificationId, setNotificationId] = useState('');
  const [sampleObjectKey, setSampleObjectKey] = useState('organizations/{organizationId}/documents/sample.pdf');
  const [recipient, setRecipient] = useState('customer@example.com');

  const command = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: Record<string, unknown> }) => apiRequest(endpoint, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents-notifications'] }),
  });

  const resolveEndpoint = (endpoint: string) => endpoint.replace('{notificationId}', notificationId);

  const buildBody = (label: string) => {
    if (label === 'Request document upload intent') return { subjectType: 'Project', subjectId: '00000000-0000-4000-8000-000000000001', fileName: 'site-photo.jpg', mimeType: 'image/jpeg', sizeBytes: 842113, category: 'SITE_PHOTO' };
    if (label === 'Complete document upload') return { subjectType: 'Project', subjectId: '00000000-0000-4000-8000-000000000001', title: 'Site photo', category: 'SITE_PHOTO', fileName: 'site-photo.jpg', mimeType: 'image/jpeg', sizeBytes: 842113, checksumSha256: 'a'.repeat(64), objectKey: sampleObjectKey };
    if (label === 'Send communication') return { subjectType: 'Project', subjectId: '00000000-0000-4000-8000-000000000001', channel: 'EMAIL', direction: 'OUTBOUND', recipient, subject: 'Project update', body: 'Project update recorded in NEXORA.', attachments: [] };
    return {};
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C12</p>
        <h1 className="text-3xl font-bold">Documents, Notifications and Communication Log Workbench</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          Completes the operational document layer: MinIO-backed document metadata, versioning, subject links, access logs, event-driven notifications, reliable EmailOutbox rows and communication history for customer/vendor disputes. Queues are used only after committed business state.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="text-sm font-medium">Notification id<input className="mt-1 w-full rounded-lg border p-2" value={notificationId} onChange={(event) => setNotificationId(event.target.value)} /></label>
        <label className="text-sm font-medium">Sample object key<input className="mt-1 w-full rounded-lg border p-2" value={sampleObjectKey} onChange={(event) => setSampleObjectKey(event.target.value)} /></label>
        <label className="text-sm font-medium">Communication recipient<input className="mt-1 w-full rounded-lg border p-2" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commands.map(([label, endpoint, help]) => (
          <button key={label} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => command.mutate({ endpoint: resolveEndpoint(endpoint), body: buildBody(label) })}>
            <div className="font-semibold">{label}</div>
            <div className="mt-1 text-xs text-slate-500">{help}</div>
            <div className="mt-2 font-mono text-xs text-slate-400">POST {endpoint}</div>
          </button>
        ))}
      </section>

      {command.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(command.error)}</div> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {lists.map(([title, endpoint]) => <DataPanel key={endpoint} title={title} endpoint={endpoint} />)}
      </section>
    </div>
  );
}
