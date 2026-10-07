'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type MaintenanceScheduleRow = {
  id: string;
  dueAt: string;
  status: string;
  effectiveStatus?: string;
  generatedWorkOrderId?: string | null;
  generatedWorkOrder?: { id: string; workOrderNo: string; status?: string } | null;
};

const completionControls = [
  'Preventive plans create the first schedule from the locked frequency policy.',
  'Maintenance scan is discover-only; it never changes work-order, stock, schedule, execution or asset state directly.',
  'Due schedules generate exactly one work order through an idempotent command.',
  'Maintenance execution completion waits for the generated field-service work order to close.',
  'Parts consumption, stock ledger rows, asset history, audit and next schedule remain one transaction.',
  'FAILED or REPLACED maintenance creates warranty/RMA review evidence for follow-up.',
  'Maintenance cost by asset is derived from stock ledger, labor and expense sources, not manual overwrite.',
];

function PolicyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

export function MaintenanceCompletionWorkbench() {
  const queryClient = useQueryClient();
  const [scheduleId, setScheduleId] = useState('');
  const [executionId, setExecutionId] = useState('');
  const [result, setResult] = useState<'PASSED' | 'REPAIRED' | 'FAILED' | 'REPLACED'>('PASSED');

  const scheduleQuery = useQuery({
    queryKey: ['m14-maintenance-schedule'],
    queryFn: () => apiRequest<{ data: MaintenanceScheduleRow[] }>('/maintenance/schedule?page=1&pageSize=15'),
  });

  const selectedSchedule = useMemo(
    () => (scheduleQuery.data?.data ?? []).find((row) => row.id === scheduleId) ?? null,
    [scheduleId, scheduleQuery.data],
  );

  const generateWorkOrder = useMutation({
    mutationFn: () => apiRequest(`/maintenance/schedules/${scheduleId}/generate-work-order`, {
      method: 'POST',
      headers: { 'Idempotency-Key': `m14-maintenance-generate-${scheduleId}` },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m14-maintenance-schedule'] });
    },
  });

  const completeExecution = useMutation({
    mutationFn: () => apiRequest(`/maintenance/executions/${executionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ result, notes: `M14 completion proof: ${result}`, parts: [] }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m14-maintenance-schedule'] });
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Missing Pass M14</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Maintenance Completion Workbench</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Blueprint completion view for preventive/corrective maintenance, bounded scan policy, schedule-to-work-order idempotency,
          execution completion, next schedule creation, warranty/RMA review and maintenance cost evidence. This page uses only the locked maintenance APIs.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="m14-schedule">Maintenance schedule</label>
          <select
            id="m14-schedule"
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select due/generated schedule</option>
            {(scheduleQuery.data?.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.id} — {row.effectiveStatus ?? row.status} — {row.dueAt}
              </option>
            ))}
          </select>
          {selectedSchedule ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Generated work order: {selectedSchedule.generatedWorkOrder?.workOrderNo ?? selectedSchedule.generatedWorkOrderId ?? 'not generated'}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!scheduleId || generateWorkOrder.isPending}
            onClick={() => generateWorkOrder.mutate()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Generate one work order idempotently
          </button>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <label className="text-sm font-medium text-slate-700" htmlFor="m14-execution">Maintenance execution</label>
          <input
            id="m14-execution"
            value={executionId}
            onChange={(event) => setExecutionId(event.target.value)}
            placeholder="Maintenance execution UUID"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="m14-result">Result</label>
          <select
            id="m14-result"
            value={result}
            onChange={(event) => setResult(event.target.value as typeof result)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="PASSED">PASSED</option>
            <option value="REPAIRED">REPAIRED</option>
            <option value="FAILED">FAILED - warranty/RMA review</option>
            <option value="REPLACED">REPLACED - warranty/RMA review</option>
          </select>
          <button
            type="button"
            disabled={!executionId || completeExecution.isPending}
            onClick={() => completeExecution.mutate()}
            className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Complete execution and create next schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">M14 locked maintenance controls</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-600">
            {completionControls.map((step) => (
              <li key={step} className="rounded-lg bg-slate-50 p-3">{step}</li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3">
          <PolicyCard title="Scan boundary" body="BullMQ maintenance.scan is limited to discovering due schedules and emitting due evidence; generation and completion remain service transactions." />
          <PolicyCard title="Warranty/RMA handoff" body="FAILED and REPLACED results now create a maintenance.warranty_rma.review_required event inside the execution-completion transaction." />
          <PolicyCard title="Cost proof" body="Maintenance cost by asset is certified as a derived read model from parts stock ledger, labor and expenses, with RBAC and tenant filters." />
          <PolicyCard title="No architecture deviation" body="The maintenance module continues to use facades for inventory, assets and field service, without direct cross-module repositories." />
        </div>
      </div>
    </section>
  );
}
