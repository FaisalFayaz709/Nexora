'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type WorkOrderRow = {
  id: string;
  workOrderNo: string;
  ticketId?: string | null;
  assetId: string;
  priority: string;
  status: string;
  scheduledAt?: string | null;
};

const completionSteps = [
  'Ticket intake validates customer, site and installed asset placement.',
  'SLA response and resolution deadlines are snapshotted on ticket create.',
  'Work order is assigned through command endpoint and accepted by the assigned technician.',
  'Technician records travel, arrival, check-in, location evidence and check-out under tenant visit policy.',
  'Draft service report captures root cause, resolution, photos, signatures and service parts.',
  'Completion consumes service parts, finalizes report, updates asset history and closes work order in one transaction.',
  'Critical status, stock and asset-history mutations are never deferred to BullMQ.',
];

function Badge({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{value}</span>;
}

function EvidenceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

export function FieldServiceCompletionWorkbench() {
  const [workOrderId, setWorkOrderId] = useState('');
  const [serviceReportId, setServiceReportId] = useState('');
  const queryClient = useQueryClient();

  const workOrders = useQuery({
    queryKey: ['m13-field-service-work-orders'],
    queryFn: () => apiRequest<{ data: WorkOrderRow[] }>('/work-orders?page=1&pageSize=15'),
  });

  const selected = useMemo(
    () => (workOrders.data?.data ?? []).find((row) => row.id === workOrderId) ?? null,
    [workOrderId, workOrders.data],
  );

  const completeWorkOrder = useMutation({
    mutationFn: () => apiRequest(`/work-orders/${workOrderId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ serviceReportId, customerConfirmed: true }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m13-field-service-work-orders'] });
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Missing Pass M13</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Field Service Completion Workbench</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Blueprint completion view for tickets, SLA, work orders, technician visits, service reports,
          service-part stock consumption and asset history linkage. This page intentionally calls the locked
          service API routes instead of adding any parallel workflow path.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="m13-work-order">Work order</label>
          <select
            id="m13-work-order"
            value={workOrderId}
            onChange={(event) => setWorkOrderId(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select work order</option>
            {(workOrders.data?.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.workOrderNo} — {row.status} — {row.priority}
              </option>
            ))}
          </select>
          {selected ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge value={`Status: ${selected.status}`} />
              <Badge value={`Priority: ${selected.priority}`} />
              <Badge value={`Asset: ${selected.assetId}`} />
              {selected.ticketId ? <Badge value={`Ticket: ${selected.ticketId}`} /> : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <label className="text-sm font-medium text-slate-700" htmlFor="m13-service-report">Draft service report</label>
          <input
            id="m13-service-report"
            value={serviceReportId}
            onChange={(event) => setServiceReportId(event.target.value)}
            placeholder="Service report UUID"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!workOrderId || !serviceReportId || completeWorkOrder.isPending}
            onClick={() => completeWorkOrder.mutate()}
            className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Complete with customer confirmation
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">M13 locked workflow</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-600">
            {completionSteps.map((step) => (
              <li key={step} className="rounded-lg bg-slate-50 p-3">{step}</li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3">
          <EvidenceCard title="Technician scope" body="Mobile commands are checked against the active assigned technician in the service layer, not trusted from the client." />
          <EvidenceCard title="Service parts" body="Non-serialized service parts consume inventory through the inventory facade inside the work-order completion transaction." />
          <EvidenceCard title="Asset history" body="Completed service is sent through the asset facade so the installed asset history remains continuous." />
          <EvidenceCard title="No async critical mutation" body="Emails, PDFs and notifications may be async; work-order status, stock, report finalization and asset history remain transaction-bound." />
        </div>
      </div>
    </section>
  );
}
