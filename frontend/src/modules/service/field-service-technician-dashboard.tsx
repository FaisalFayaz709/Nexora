'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type TicketRow = {
  id: string;
  ticketNo: string;
  subject?: string | null;
  priority: string;
  status: string;
  assetId?: string | null;
  assignedToId?: string | null;
};

type WorkOrderRow = {
  id: string;
  workOrderNo: string;
  ticketId?: string | null;
  assetId: string;
  priority: string;
  status: string;
  scheduledAt?: string | null;
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">{String(value ?? '—')}</div>
    </div>
  );
}

function CommandCard({ title, route, note }: { title: string; route: string; note: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="font-medium text-slate-900">{title}</div>
      <code className="mt-2 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{route}</code>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

const lifecycle = [
  'Ticket opened with SLA response and resolution deadlines.',
  'Ticket assigned, then work order created, validated and assigned.',
  'Assigned technician accepts, starts travel, arrives/checks in and records onsite work.',
  'Service report captures work, root cause, resolution, photos, signatures and spare parts.',
  'Technician checks out; completion consumes parts, updates asset history and closes the work order atomically.',
  'Customer confirmation closes ticket/work order without async stock or status mutation.',
];

export function FieldServiceTechnicianDashboard() {
  const [ticketId, setTicketId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [serviceReportId, setServiceReportId] = useState('');
  const queryClient = useQueryClient();

  const tickets = useQuery({
    queryKey: ['c8-field-service-tickets'],
    queryFn: () => apiRequest<{ data: TicketRow[] }>('/tickets?page=1&pageSize=10'),
  });

  const workOrders = useQuery({
    queryKey: ['c8-field-service-work-orders', ticketId],
    queryFn: () => apiRequest<{ data: WorkOrderRow[] }>(ticketId ? `/work-orders?page=1&pageSize=10&ticketId=${ticketId}` : '/work-orders?page=1&pageSize=10'),
  });

  const workOrder = useQuery({
    queryKey: ['c8-field-service-work-order-detail', workOrderId],
    enabled: Boolean(workOrderId),
    queryFn: () => apiRequest<any>(`/work-orders/${workOrderId}`),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['c8-field-service-tickets'] });
    await queryClient.invalidateQueries({ queryKey: ['c8-field-service-work-orders'] });
    await queryClient.invalidateQueries({ queryKey: ['c8-field-service-work-order-detail', workOrderId] });
  };

  const assignWorkOrder = useMutation({
    mutationFn: () => apiRequest<any>(`/work-orders/${workOrderId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ technicianId }),
    }),
    onSuccess: refresh,
  });

  const technicianCommand = useMutation({
    mutationFn: (command: 'accept' | 'start-travel' | 'arrive' | 'start') => apiRequest<any>(`/work-orders/${workOrderId}/${command}`, {
      method: 'POST',
      body: JSON.stringify({ note: `C8 ${command} command from technician workbench` }),
    }),
    onSuccess: refresh,
  });

  const visitCommand = useMutation({
    mutationFn: (command: 'check-in' | 'check-out') => apiRequest<any>(`/work-orders/${workOrderId}/${command}`, {
      method: 'POST',
      body: JSON.stringify({ capturedAt: new Date().toISOString() }),
    }),
    onSuccess: refresh,
  });

  const completeWorkOrder = useMutation({
    mutationFn: () => apiRequest<any>(`/work-orders/${workOrderId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ serviceReportId, customerConfirmed: true }),
    }),
    onSuccess: refresh,
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pass C8</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Field Service & Technician Flow</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Locked service workflow from customer ticket and SLA through technician assignment,
          travel, onsite check-in, service report, parts consumption, customer confirmation and work-order closure.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Select ticket</h2>
          <select
            value={ticketId}
            onChange={(event) => {
              setTicketId(event.target.value);
              setWorkOrderId('');
            }}
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All tickets</option>
            {(tickets.data?.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.ticketNo} — {row.status} — {row.priority} — {row.subject ?? row.assetId}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Select work order</h2>
          <select
            value={workOrderId}
            onChange={(event) => setWorkOrderId(event.target.value)}
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select work order</option>
            {(workOrders.data?.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.workOrderNo} — {row.status} — {row.priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      {workOrderId ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Work order" value={workOrder.data?.data?.workOrderNo} />
            <Field label="Status" value={workOrder.data?.data?.status} />
            <Field label="Priority" value={workOrder.data?.data?.priority} />
            <Field label="Asset" value={workOrder.data?.data?.assetId} />
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Technician commands</h2>
            <p className="mt-1 text-xs text-slate-500">
              Check-in, location and check-out endpoints are technician-scoped in the service layer and obey tenant visit policy.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={technicianId}
                onChange={(event) => setTechnicianId(event.target.value)}
                placeholder="Technician employee UUID for assignment"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={serviceReportId}
                onChange={(event) => setServiceReportId(event.target.value)}
                placeholder="Draft service report UUID for completion"
                className="rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!technicianId || assignWorkOrder.isPending} onClick={() => assignWorkOrder.mutate()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">Assign technician</button>
              <button type="button" onClick={() => technicianCommand.mutate('accept')} className="rounded-lg border px-3 py-2 text-sm">Accept</button>
              <button type="button" onClick={() => technicianCommand.mutate('start-travel')} className="rounded-lg border px-3 py-2 text-sm">Start travel</button>
              <button type="button" onClick={() => technicianCommand.mutate('arrive')} className="rounded-lg border px-3 py-2 text-sm">Arrive</button>
              <button type="button" onClick={() => visitCommand.mutate('check-in')} className="rounded-lg border px-3 py-2 text-sm">Check in</button>
              <button type="button" onClick={() => technicianCommand.mutate('start')} className="rounded-lg border px-3 py-2 text-sm">Start work</button>
              <button type="button" onClick={() => visitCommand.mutate('check-out')} className="rounded-lg border px-3 py-2 text-sm">Check out</button>
              <button type="button" disabled={!serviceReportId || completeWorkOrder.isPending} onClick={() => completeWorkOrder.mutate()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">Complete</button>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Blueprint lifecycle controls</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {lifecycle.map((item) => (
              <li key={item} className="rounded-lg bg-slate-50 p-3">{item}</li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3">
          <CommandCard title="Create ticket" route="POST /api/v1/tickets" note="Creates ticket, SLA deadlines, audit event and ticket.created domain event transactionally." />
          <CommandCard title="Assign and execute work" route="POST /api/v1/work-orders/:id/assign | /accept | /start-travel | /arrive | /start" note="State transitions are command endpoints, not free-form PATCH status changes." />
          <CommandCard title="Visit evidence" route="POST /api/v1/work-orders/:id/check-in | /location | /check-out" note="Location and proof collection is tenant-policy controlled with retention handling." />
          <CommandCard title="Service report and close" route="POST /api/v1/work-orders/:id/service-report | /complete" note="Completion consumes parts, updates asset service history, resolves ticket and writes audit in one transaction." />
        </div>
      </div>
    </section>
  );
}
