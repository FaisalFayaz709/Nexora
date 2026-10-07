'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

const dashboardPanels = [
  ['Reports', '/reports?page=1&pageSize=10'],
  ['Global search', '/search?q=PRJ&page=1&pageSize=10'],
  ['Unified calendar', '/calendar?from=2026-09-01&to=2026-09-30&page=1&pageSize=10'],
] as const;

const commands = [
  ['Create report template', '/report-templates', 'Defines source fields, filters, chart type and required permission scope.'],
  ['Create saved report', '/saved-reports', 'Persists user filters/columns without weakening the source permission scope.'],
  ['Create scheduled report', '/scheduled-reports', 'Creates auditable schedule and ReportExecution for export delivery.'],
  ['Request report export', '/reports/exports', 'Creates ReportExecution; worker consumes report.export for CSV/XLSX/PDF.'],
] as const;

function DataPanel({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['c13-reports', endpoint], queryFn: () => apiRequest<any>(endpoint) });
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Source: {endpoint}</p>
      <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function ReportsDashboardsWorkbench() {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [savedReportId, setSavedReportId] = useState('');
  const [format, setFormat] = useState<'CSV' | 'XLSX' | 'PDF'>('CSV');
  const [recipient, setRecipient] = useState('manager@example.com');

  const command = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: Record<string, unknown> }) => apiRequest(endpoint, { method: 'POST', headers: { 'Idempotency-Key': `c13-${Date.now()}` }, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c13-reports'] }),
  });

  const sampleTemplateBody = useMemo(() => ({
    name: 'Project Health Dashboard',
    description: 'C13 project dashboard source for progress, budget and milestones.',
    dataSource: 'PROJECTS',
    selectedFields: ['projectNo', 'status', 'dueDate', 'completionPct'],
    filterJson: { status: 'ACTIVE' },
    chartType: 'TABLE',
    permissionScope: ['project.view'],
    isSystem: false,
  }), []);

  const bodyFor = (label: string) => {
    if (label === 'Create report template') return sampleTemplateBody;
    if (label === 'Create saved report') return { templateId, name: 'My Project Health View', selectedFields: ['projectNo', 'status', 'dueDate'], filterJson: { status: 'ACTIVE' }, chartType: 'TABLE', permissionScope: ['project.view'] };
    if (label === 'Create scheduled report') return { savedReportId, frequency: 'DAILY', timezone: 'Asia/Karachi', nextRunAt: new Date(Date.now() + 86_400_000).toISOString(), recipients: [recipient], active: true };
    return { reportId: savedReportId, format, filterJson: {} };
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C13</p>
        <h1 className="text-3xl font-bold">Reports, Dashboards, Global Search and Calendar Workbench</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          Completes role dashboards, permission-scoped saved reports, scheduled exports, global search, unified calendar and report export controls. Reports/search/calendar are read models and export workflows only; they cannot mutate stock, finance, approval or accounting state.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium">Template id<input className="mt-1 w-full rounded-lg border p-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)} /></label>
        <label className="text-sm font-medium">Saved report id<input className="mt-1 w-full rounded-lg border p-2" value={savedReportId} onChange={(event) => setSavedReportId(event.target.value)} /></label>
        <label className="text-sm font-medium">Recipient<input className="mt-1 w-full rounded-lg border p-2" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
        <label className="text-sm font-medium">Export format<select className="mt-1 w-full rounded-lg border p-2" value={format} onChange={(event) => setFormat(event.target.value as 'CSV' | 'XLSX' | 'PDF')}><option>CSV</option><option>XLSX</option><option>PDF</option></select></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commands.map(([label, endpoint, help]) => (
          <button key={label} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => command.mutate({ endpoint, body: bodyFor(label) })}>
            <div className="font-semibold">{label}</div>
            <div className="mt-1 text-xs text-slate-500">{help}</div>
            <div className="mt-2 font-mono text-xs text-slate-400">POST {endpoint}</div>
          </button>
        ))}
      </section>

      {command.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(command.error)}</div> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {dashboardPanels.map(([title, endpoint]) => <DataPanel key={endpoint} title={title} endpoint={endpoint} />)}
      </section>
    </div>
  );
}
