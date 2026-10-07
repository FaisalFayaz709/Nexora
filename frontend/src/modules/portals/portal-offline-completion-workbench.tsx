'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

const customerSurfaces = [
  ['Projects', '/portal/customer/projects'],
  ['Assets', '/portal/customer/assets'],
  ['Invoices', '/portal/customer/invoices'],
  ['Documents', '/portal/customer/documents'],
] as const;

const vendorSurfaces = [
  ['RFQs', '/portal/vendor/rfqs'],
  ['Purchase Orders', '/portal/vendor/purchase-orders'],
  ['Invoices', '/portal/vendor/invoices'],
  ['Payments', '/portal/vendor/payments'],
] as const;

const technicianSurfaces = [
  ['My Jobs', '/portal/technician/jobs'],
  ['Offline Queue Policy', '/portal/technician/offline-sync/policy'],
] as const;

function SurfaceCard({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['m17-portal-surface', endpoint], queryFn: () => apiRequest<any>(endpoint) });
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <code className="mt-2 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">GET {endpoint}</code>
      <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function PortalOfflineCompletionWorkbench() {
  const qc = useQueryClient();
  const [rfqId, setRfqId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [deviceId, setDeviceId] = useState('tech-device-001');

  const offlineBody = useMemo(() => ({
    clientBatchId: `batch-${Date.now()}`,
    deviceId,
    tenantClockAt: new Date().toISOString(),
    commands: [
      {
        clientCommandId: `m17-${Date.now()}`,
        workOrderId,
        type: 'CHECK_IN',
        occurredAt: new Date().toISOString(),
        payload: { evidenceDocumentIds: documentId ? [documentId] : [] },
      },
    ],
  }), [deviceId, documentId, workOrderId]);

  const mutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: Record<string, unknown> }) => apiRequest(endpoint, { method: 'POST', headers: { 'Idempotency-Key': `m17-${endpoint}-${Date.now()}` }, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['m17-portal-surface'] }),
  });

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Missing Pass M17</p>
        <h1 className="text-3xl font-bold text-slate-950">Portals, Technician PWA & Offline Sync Completion</h1>
        <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">
          Customer, vendor and technician portal surfaces stay linked-subject scoped. Technician PWA commands and offline replay use the same transactional command boundaries as online service workflows; offline workers may only deliver post-commit notifications.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium">RFQ ID<input className="mt-1 w-full rounded-lg border p-2" value={rfqId} onChange={(event) => setRfqId(event.target.value)} /></label>
        <label className="text-sm font-medium">Work Order ID<input className="mt-1 w-full rounded-lg border p-2" value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)} /></label>
        <label className="text-sm font-medium">Evidence Document ID<input className="mt-1 w-full rounded-lg border p-2" value={documentId} onChange={(event) => setDocumentId(event.target.value)} /></label>
        <label className="text-sm font-medium">Device ID<input className="mt-1 w-full rounded-lg border p-2" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" disabled={!workOrderId || !documentId} onClick={() => mutation.mutate({ endpoint: `/portal/customer/work-orders/${workOrderId}/approve`, body: { approved: true, signatureDocumentId: documentId, comment: 'M17 customer completion approval' } })}>
          <div className="font-semibold">Customer approve completed work</div>
          <p className="mt-1 text-xs text-slate-500">Requires linked customer scope plus signature Document evidence.</p>
        </button>
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" disabled={!rfqId} onClick={() => mutation.mutate({ endpoint: `/portal/vendor/rfqs/${rfqId}/quotations`, body: { quoteRef: `M17-${Date.now()}`, lines: [] } })}>
          <div className="font-semibold">Vendor submit quotation</div>
          <p className="mt-1 text-xs text-slate-500">Allowed only for linked, invited and approved vendor.</p>
        </button>
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" disabled={!workOrderId} onClick={() => mutation.mutate({ endpoint: '/portal/technician/offline-sync', body: offlineBody })}>
          <div className="font-semibold">Replay offline PWA command</div>
          <p className="mt-1 text-xs text-slate-500">Uses clientCommandId and payload hash idempotency; no async critical mutation.</p>
        </button>
      </section>

      {mutation.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(mutation.error)}</div> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Customer portal</h2>
          {customerSurfaces.map(([title, endpoint]) => <SurfaceCard key={endpoint} title={title} endpoint={endpoint} />)}
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vendor portal</h2>
          {vendorSurfaces.map(([title, endpoint]) => <SurfaceCard key={endpoint} title={title} endpoint={endpoint} />)}
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Technician PWA</h2>
          {technicianSurfaces.map(([title, endpoint]) => <SurfaceCard key={endpoint} title={title} endpoint={endpoint} />)}
        </div>
      </section>
    </main>
  );
}
