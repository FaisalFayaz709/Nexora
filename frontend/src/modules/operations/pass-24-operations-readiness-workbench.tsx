'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pass24OperationsReadinessManifest } from '@nexora/shared';

import { DataTable } from '@/components/data';

type Pass24OperationRow = {
  id: string;
  domain: string;
  requiredArtifact: string;
  status: string;
};

export function Pass24OperationsReadinessWorkbench() {
  const columns = useMemo<ColumnDef<Pass24OperationRow>[]>(() => [
    { id: 'id', header: 'Control', accessorKey: 'id', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { id: 'domain', header: 'Domain', accessorKey: 'domain' },
    { id: 'requiredArtifact', header: 'Required runtime artifact', accessorKey: 'requiredArtifact' },
    { id: 'status', header: 'Status', accessorKey: 'status' },
  ], []);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">PASS 24 Operations Gate</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Performance, Backup, Restore, Observability and DR</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This read-only workbench lists the runtime evidence required before production GO. It does not run backups,
          mutate stock, post journals, approve workflows, or bypass tenant/RBAC checks.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(Pass24OperationsReadinessManifest.thresholds).map(([metric, value]) => (
          <article key={metric} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">{metric}</h2>
            <p className="mt-2 text-sm text-slate-600">Threshold: {String(value)}</p>
            <p className="mt-3 text-xs font-medium uppercase text-slate-500">Blocks production GO</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Runtime evidence checklist</h2>
        <div className="mt-4">
          <DataTable<Pass24OperationRow, unknown>
            columns={columns}
            data={Pass24OperationsReadinessManifest.rows as readonly Pass24OperationRow[]}
            emptyTitle="No operations controls"
            emptyDescription="The PASS 24 operations manifest did not expose any evidence controls."
          />
        </div>
      </section>
    </main>
  );
}
