'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data';
import { Button, Input } from '@/components/ui';
import { apiRequest, type ApiListEnvelope } from '@/lib/api-client';
import { StatusBadge } from '@/components/workflow';

type MaintenanceScheduleRow = {
  id: string;
  dueAt?: string;
  status?: string;
  effectiveStatus?: string;
  generatedWorkOrderId?: string;
  generatedWorkOrder?: { workOrderNo?: string };
};

const lifecycle = [
  'Create preventive plan',
  'Review due schedule',
  'Generate one work order',
  'Complete field-service work order',
  'Complete maintenance execution',
  'Create next schedule',
];

function rows<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

export function MaintenanceWorkbench() {
  const queryClient = useQueryClient();
  const [scheduleId, setScheduleId] = useState('');
  const [executionId, setExecutionId] = useState('');

  const scheduleQuery = useQuery({
    queryKey: ['maintenance-schedule', 'workbench'],
    queryFn: () => apiRequest<ApiListEnvelope<MaintenanceScheduleRow>>('/maintenance/schedule?page=1&pageSize=10'),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest(`/maintenance/schedules/${scheduleId}/generate-work-order`, {
      method: 'POST',
      headers: { 'Idempotency-Key': `maintenance-generate-${scheduleId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest(`/maintenance/executions/${executionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ result: 'PASSED', parts: [] }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] }),
  });

  const schedules = rows<MaintenanceScheduleRow>(scheduleQuery.data?.data);
  const scheduleColumns = useMemo<ColumnDef<MaintenanceScheduleRow>[]>(() => [
    { id: 'id', header: 'Schedule', accessorKey: 'id', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { id: 'dueAt', header: 'Due', accessorKey: 'dueAt' },
    { id: 'status', header: 'Status', accessorFn: (row) => row.effectiveStatus ?? row.status ?? '—', cell: ({ getValue }) => (typeof getValue() === 'string' ? <StatusBadge status={getValue<string>()} /> : '—') },
    { id: 'generatedWorkOrder', header: 'Generated Work Order', accessorFn: (row) => row.generatedWorkOrder?.workOrderNo ?? row.generatedWorkOrderId ?? 'Not generated' },
  ], []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance Workbench</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Complete the C9 preventive/corrective maintenance flow without bypassing the locked architecture: maintenance scans discover due schedules, while work-order generation, parts consumption, asset history and next schedule creation remain transactional API/service operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {lifecycle.map((item, index) => (
          <div key={item} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Step {index + 1}</div>
            <div className="mt-2 font-medium text-slate-900">{item}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Due schedules</h2>
        <div className="mt-4">
          <DataTable<MaintenanceScheduleRow, unknown>
            columns={scheduleColumns}
            data={schedules}
            loading={scheduleQuery.isLoading}
            error={scheduleQuery.error instanceof Error ? scheduleQuery.error.message : undefined}
            emptyTitle="No due schedules"
            emptyDescription="No due maintenance schedule records are visible for the current tenant scope."
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Generate maintenance work order</h2>
          <Input
            className="mt-3"
            placeholder="Maintenance schedule ID"
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
          />
          <Button
            type="button"
            className="mt-3"
            disabled={!scheduleId || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            Generate exactly one work order
          </Button>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Complete maintenance execution</h2>
          <Input
            className="mt-3"
            placeholder="Maintenance execution ID"
            value={executionId}
            onChange={(event) => setExecutionId(event.target.value)}
          />
          <Button
            type="button"
            className="mt-3"
            disabled={!executionId || completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
          >
            Complete execution and create next schedule
          </Button>
        </div>
      </div>
    </section>
  );
}
