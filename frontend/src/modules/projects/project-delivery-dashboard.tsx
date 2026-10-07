'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data';
import { apiRequest, type ApiListEnvelope, type ApiSingleEnvelope } from '@/lib/api-client';

type ProjectRow = {
  id: string;
  projectNo: string;
  name: string;
  status: string;
  dueDate?: string;
  contractValue?: string;
};

type BomLineRow = {
  id: string;
  productId?: string;
  requiredQty?: string;
  reservedQty?: string;
  issuedQty?: string;
  availableFreeQty?: string;
  shortageQty?: string;
};

type ProjectBom = {
  status?: string;
  version?: string | number;
  items?: BomLineRow[];
};

type ProjectBudget = {
  totalBudget?: string;
};

type ProjectCosting = {
  grossProfit?: string;
  contractValue?: string;
  committedCost?: string;
  actualMaterialCost?: string;
  totalActualCost?: string;
  profitMarginPct?: string;
  costingMaturity?: string;
};

type TimelineEvent = {
  type?: string;
  referenceType?: string;
  referenceNo?: string;
  referenceId?: string;
  occurredAt?: string;
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">{String(value ?? '—')}</div>
    </div>
  );
}

function listRows<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

export function ProjectDeliveryDashboard() {
  const [projectId, setProjectId] = useState('');

  const projects = useQuery({
    queryKey: ['c6-projects'],
    queryFn: () => apiRequest<ApiListEnvelope<ProjectRow>>('/projects?page=1&pageSize=10'),
  });

  const bom = useQuery({
    queryKey: ['c6-project-bom', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<ApiSingleEnvelope<ProjectBom>>(`/projects/${projectId}/bom`),
  });

  const budget = useQuery({
    queryKey: ['c6-project-budget', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<ApiSingleEnvelope<ProjectBudget>>(`/projects/${projectId}/budget`),
  });

  const costing = useQuery({
    queryKey: ['c6-project-costing', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<ApiSingleEnvelope<ProjectCosting>>(`/projects/${projectId}/costing`),
  });

  const timeline = useQuery({
    queryKey: ['c6-project-timeline', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<ApiListEnvelope<TimelineEvent>>(`/projects/${projectId}/timeline?limit=25`),
  });

  const bomColumns = useMemo<ColumnDef<BomLineRow>[]>(() => [
    { id: 'productId', header: 'Product', accessorKey: 'productId' },
    { id: 'requiredQty', header: 'Required', accessorKey: 'requiredQty' },
    { id: 'reservedQty', header: 'Reserved', accessorKey: 'reservedQty' },
    { id: 'issuedQty', header: 'Issued', accessorKey: 'issuedQty' },
    { id: 'availableFreeQty', header: 'Free', accessorKey: 'availableFreeQty' },
    { id: 'shortageQty', header: 'Shortage', accessorKey: 'shortageQty', cell: ({ getValue }) => <span className="font-medium">{String(getValue() ?? '—')}</span> },
  ], []);

  const bomItems = listRows<BomLineRow>(bom.data?.data?.items);
  const timelineRows = listRows<TimelineEvent>(timeline.data?.data);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Projects, BOM, Budget & Costing</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          C6 workbench for the locked project lifecycle: project planning, task continuity,
          approved BOM, inventory shortage visibility, material-requirement trigger, budget
          summary, project profitability and timeline traceability.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="project-id">Project</label>
        <select
          id="project-id"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select a project to inspect the delivery chain</option>
          {listRows<ProjectRow>(projects.data?.data).map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectNo} — {project.name} — {project.status}
            </option>
          ))}
        </select>
      </div>

      {!projectId ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          Select a project to load BOM, budget, costing and timeline evidence.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="BOM status" value={bom.data?.data?.status} />
            <Field label="BOM version" value={bom.data?.data?.version} />
            <Field label="Budget" value={budget.data?.data?.totalBudget} />
            <Field label="Gross profit" value={costing.data?.data?.grossProfit} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">BOM shortage lines</h2>
              <div className="mt-4">
                <DataTable<BomLineRow, unknown>
                  columns={bomColumns}
                  data={bomItems}
                  loading={bom.isLoading}
                  error={bom.error instanceof Error ? bom.error.message : undefined}
                  emptyTitle="No BOM lines"
                  emptyDescription="No material planning rows are visible for this selected project."
                />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Costing read model</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Contract value" value={costing.data?.data?.contractValue} />
                <Field label="Committed cost" value={costing.data?.data?.committedCost} />
                <Field label="Actual material" value={costing.data?.data?.actualMaterialCost} />
                <Field label="Total actual" value={costing.data?.data?.totalActualCost} />
                <Field label="Profit margin" value={`${costing.data?.data?.profitMarginPct ?? '0.00'}%`} />
                <Field label="Maturity" value={costing.data?.data?.costingMaturity} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Project timeline continuity</h2>
            <div className="mt-4 space-y-3">
              {timelineRows.map((event, index) => (
                <div key={`${event.type ?? 'event'}-${event.referenceId ?? index}`} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium text-slate-900">{event.type ?? 'Timeline event'}</div>
                  <div className="text-xs text-slate-500">
                    {event.referenceType} {event.referenceNo ?? event.referenceId ?? ''} · {String(event.occurredAt ?? '')}
                  </div>
                </div>
              ))}
              {timelineRows.length === 0 ? <p className="text-sm text-slate-500">No timeline events returned for this project.</p> : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
