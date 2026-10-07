'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

const panels = [
  ['Role dashboard read model', '/reports?page=1&pageSize=10'],
  ['Permission-scoped global search', '/search?q=project&page=1&pageSize=10'],
  ['Branch-scoped unified calendar', '/calendar?from=2026-09-01&to=2026-09-30&page=1&pageSize=10'],
] as const;

const controls = [
  'Dashboard widgets inherit source permission scope',
  'Saved reports cannot weaken source permissions',
  'Report builder fields are allowlisted per data source',
  'Report exports create audited ReportExecution rows',
  'Search index and calendar feed are derived read models only',
  'Report jobs cannot mutate stock, money, approval or journal state',
] as const;

function Panel({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['m16-report-dashboard-search-calendar', endpoint], queryFn: () => apiRequest<any>(endpoint) });
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">GET {endpoint}</p>
      <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function ReportsCompletionWorkbench() {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [savedReportId, setSavedReportId] = useState('');
  const [search, setSearch] = useState('project');
  const [recipient, setRecipient] = useState('manager@example.com');

  const templateBody = useMemo(() => ({
    name: 'M16 Project Cost and Handover Dashboard',
    description: 'Permission-scoped project dashboard for budget, committed cost, actual cost and handover readiness.',
    dataSource: 'PROJECTS',
    selectedFields: ['projectNo', 'status', 'dueDate', 'completionPct', 'budgetTotal', 'actualCost', 'committedCost'],
    filterJson: { status: 'ACTIVE' },
    chartType: 'TABLE',
    permissionScope: ['project.view'],
    isSystem: false,
  }), []);

  const mutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: Record<string, unknown> }) => apiRequest(endpoint, { method: 'POST', headers: { 'Idempotency-Key': `m16-${endpoint}-${Date.now()}` }, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['m16-report-dashboard-search-calendar'] }),
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Missing Pass M16</p>
        <h1 className="text-3xl font-bold">Reports, Dashboards, Global Search & Calendar Completion</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          This workbench verifies the report/dashboard/search/calendar read-model layer. It does not introduce unlisted backend routes and it does not allow reporting jobs to mutate stock, money, approval, invoice balance or journal state.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium">Template ID<input className="mt-1 w-full rounded-lg border p-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)} /></label>
        <label className="text-sm font-medium">Saved report ID<input className="mt-1 w-full rounded-lg border p-2" value={savedReportId} onChange={(event) => setSavedReportId(event.target.value)} /></label>
        <label className="text-sm font-medium">Search text<input className="mt-1 w-full rounded-lg border p-2" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="text-sm font-medium">Recipient<input className="mt-1 w-full rounded-lg border p-2" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => mutation.mutate({ endpoint: '/report-templates', body: templateBody })}>
          <div className="font-semibold">Create scoped template</div>
          <p className="mt-1 text-xs text-slate-500">Uses PROJECTS field allowlist and project.view permission scope.</p>
        </button>
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => mutation.mutate({ endpoint: '/saved-reports', body: { templateId, name: 'M16 Project Dashboard View', selectedFields: ['projectNo', 'status', 'actualCost'], filterJson: { status: 'ACTIVE' }, chartType: 'TABLE', permissionScope: ['project.view'] } })}>
          <div className="font-semibold">Create saved report</div>
          <p className="mt-1 text-xs text-slate-500">Persists permission scope instead of relying on UI-only checks.</p>
        </button>
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => mutation.mutate({ endpoint: '/scheduled-reports', body: { savedReportId, frequency: 'DAILY', timezone: 'Asia/Karachi', nextRunAt: new Date(Date.now() + 86_400_000).toISOString(), recipients: [recipient], active: true } })}>
          <div className="font-semibold">Schedule report</div>
          <p className="mt-1 text-xs text-slate-500">Creates auditable schedule plus pending report execution.</p>
        </button>
        <button className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => qc.invalidateQueries({ queryKey: ['m16-report-dashboard-search-calendar', `/search?q=${encodeURIComponent(search)}&page=1&pageSize=10`] })}>
          <div className="font-semibold">Refresh search view</div>
          <p className="mt-1 text-xs text-slate-500">Search remains tenant, branch and permission scoped.</p>
        </button>
      </section>

      {mutation.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(mutation.error)}</div> : null}

      <section className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        {controls.map((control) => <div key={control} className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">{control}</div>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {panels.map(([title, endpoint]) => <Panel key={endpoint} title={title} endpoint={endpoint} />)}
        <Panel title="Live search preview" endpoint={`/search?q=${encodeURIComponent(search || 'project')}&page=1&pageSize=10`} />
      </section>
    </div>
  );
}
