'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { M21PerformanceBackupObservabilityManifest } from '@nexora/shared';

import { DataTable } from '@/components/data';

type OperationsControlRow = {
  controlId: string;
  domain: string;
  runtimeProof: string;
};

export function M21OperationsCompletionWorkbench() {
  const columns = useMemo<ColumnDef<OperationsControlRow>[]>(() => [
    { id: 'controlId', header: 'Control', accessorKey: 'controlId', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { id: 'domain', header: 'Domain', accessorKey: 'domain' },
    { id: 'runtimeProof', header: 'Runtime proof', accessorKey: 'runtimeProof' },
  ], []);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Missing Pass M21</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Performance, Backup, Restore and Observability</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This workbench is a read-only runtime evidence checklist. It does not run backups, mutate data,
          alter stock, post journals, approve workflows or bypass backend authorization.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {M21PerformanceBackupObservabilityManifest.thresholds.map((threshold) => (
          <article key={threshold.metric} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">{threshold.metric}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {threshold.comparison} {threshold.threshold} {threshold.unit}
            </p>
            <p className="mt-3 text-xs font-medium uppercase text-slate-500">Blocks production</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Operational readiness controls</h2>
        <div className="mt-4">
          <DataTable<OperationsControlRow, unknown>
            columns={columns}
            data={M21PerformanceBackupObservabilityManifest.controls as OperationsControlRow[]}
            emptyTitle="No operational controls"
            emptyDescription="The runtime readiness manifest did not expose any operational controls."
          />
        </div>
      </section>
    </main>
  );
}
