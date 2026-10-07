'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data';
import { apiRequest, type ApiListEnvelope } from '@/lib/api-client';
import { StatusBadge } from '@/components/workflow';

type ApprovalInboxRow = {
  id: string;
  subjectType?: string;
  definitionName?: string;
  definitionId?: string;
  status?: string;
  currentStep?: { sequence?: number | string };
};

type ApprovalDefinitionRow = {
  id: string;
  subjectType?: string;
  name?: string;
  active?: boolean;
};

const decisionActions = [
  {
    label: 'Approve current step',
    endpoint: 'POST /api/v1/approvals/:id/approve',
    guard: 'approval.act + eligible user/role + maker-checker',
  },
  {
    label: 'Reject with comment',
    endpoint: 'POST /api/v1/approvals/:id/reject',
    guard: 'approval.act + required rejection comment',
  },
  {
    label: 'Return for correction',
    endpoint: 'POST /api/v1/approvals/:id/return',
    guard: 'approval.act + subject decision handler',
  },
] as const;

const definitionControls = [
  'Subject type must be registered before a workflow can be used.',
  'Step sequences must start at 1 and be contiguous.',
  'Role steps may require multiple approvals; user steps are single-approver only.',
  'Approval requests are created by the owning domain inside its transaction.',
  'Final approval updates the subject through a registered domain facade handler.',
  'BullMQ is not used to mutate approval state.',
] as const;

function rows<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

export function ApprovalEngineConsole() {
  const inbox = useQuery({
    queryKey: ['approval-engine-console', 'inbox'],
    queryFn: () => apiRequest<ApiListEnvelope<ApprovalInboxRow>>('/approvals/inbox?page=1&pageSize=10'),
  });

  const definitions = useQuery({
    queryKey: ['approval-engine-console', 'definitions'],
    queryFn: () => apiRequest<ApiListEnvelope<ApprovalDefinitionRow>>('/approval-definitions?page=1&pageSize=10'),
  });

  const inboxRows = rows<ApprovalInboxRow>(inbox.data?.data);
  const definitionRows = rows<ApprovalDefinitionRow>(definitions.data?.data);

  const inboxColumns = useMemo<ColumnDef<ApprovalInboxRow>[]>(() => [
    { id: 'subjectType', header: 'Subject', accessorKey: 'subjectType' },
    { id: 'workflow', header: 'Workflow', accessorFn: (row) => row.definitionName ?? row.definitionId ?? '—' },
    { id: 'status', header: 'Status', accessorKey: 'status', cell: ({ getValue }) => (typeof getValue() === 'string' ? <StatusBadge status={getValue<string>()} /> : '—') },
    { id: 'step', header: 'Step', accessorFn: (row) => row.currentStep?.sequence ?? '—' },
  ], []);

  const definitionColumns = useMemo<ColumnDef<ApprovalDefinitionRow>[]>(() => [
    { id: 'subjectType', header: 'Subject Type', accessorKey: 'subjectType' },
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'active', header: 'Active', accessorFn: (row) => (row.active ? 'Yes' : 'No') },
  ], []);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C5</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Approval Engine & Maker-Checker</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Central workflow console for tenant-scoped approval definitions, current approver inbox,
          decision commands, maker-checker separation, subject-facade transitions and audit evidence.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {decisionActions.map((item) => (
          <article key={item.endpoint} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-2 font-mono text-xs text-slate-500">{item.endpoint}</p>
            <p className="mt-3 text-sm text-slate-600">{item.guard}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Current approval inbox</h2>
          <p className="mb-4 text-sm text-slate-500">Only eligible non-creator steps should appear here.</p>
          <DataTable<ApprovalInboxRow, unknown>
            columns={inboxColumns}
            data={inboxRows}
            loading={inbox.isLoading}
            error={inbox.error instanceof Error ? inbox.error.message : undefined}
            emptyTitle="No pending approvals"
            emptyDescription="No pending approvals are visible in your current tenant and role scope."
          />
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-900">Locked workflow controls</h2>
            <p className="text-sm text-slate-500">These controls protect approval state from unsafe shortcuts.</p>
          </div>
          <ul className="space-y-3 p-5 text-sm text-slate-700">
            {definitionControls.map((control) => (
              <li key={control} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                {control}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Approval definitions</h2>
        <p className="mb-4 text-sm text-slate-500">Tenant-owned active definitions drive subject workflows.</p>
        <DataTable<ApprovalDefinitionRow, unknown>
          columns={definitionColumns}
          data={definitionRows}
          loading={definitions.isLoading}
          error={definitions.error instanceof Error ? definitions.error.message : undefined}
          emptyTitle="No approval definitions"
          emptyDescription="No approval definitions have been configured yet."
        />
      </div>
    </section>
  );
}
