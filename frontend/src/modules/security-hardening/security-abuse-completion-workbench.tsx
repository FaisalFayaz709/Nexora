'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  M19HighRiskCommandRegistry,
  M19RuntimeAbuseScenarios,
  M19SecurityCompletionManifest,
  M19SecurityCompletionRows,
} from '@nexora/shared';

import { DataTable } from '@/components/data';

type HighRiskCommandRow = {
  category: string;
  routePattern: string;
  requiredPermission: string;
  requiresMakerChecker: boolean;
  requiresIdempotencyKey: boolean;
  requiresAuditLog: boolean;
};

export function SecurityAbuseCompletionWorkbench() {
  const makerCheckerCommands = useMemo(() => M19HighRiskCommandRegistry.filter((command) => command.requiresMakerChecker), []);
  const commandColumns = useMemo<ColumnDef<HighRiskCommandRow>[]>(() => [
    { id: 'category', header: 'Category', accessorKey: 'category' },
    { id: 'routePattern', header: 'Route', accessorKey: 'routePattern', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { id: 'requiredPermission', header: 'Permission', accessorKey: 'requiredPermission' },
    { id: 'requiresMakerChecker', header: 'Maker-checker', accessorFn: (row) => (row.requiresMakerChecker ? 'required' : 'not required') },
    { id: 'requiresIdempotencyKey', header: 'Idempotency', accessorFn: (row) => (row.requiresIdempotencyKey ? 'required' : 'not required') },
    { id: 'requiresAuditLog', header: 'Audit', accessorFn: (row) => (row.requiresAuditLog ? 'required' : 'not required') },
  ], []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Missing Pass M19</p>
        <h1 className="text-3xl font-bold">Security, Abuse Cases, Maker-Checker & Production Gate Completion</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          This workbench is read-only evidence for the security completion pass. It lists the high-risk command controls, abuse scenarios and release blockers that must be runtime-certified before production.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        <div><div className="text-2xl font-bold">{M19HighRiskCommandRegistry.length}</div><p className="text-sm text-slate-500">high-risk commands</p></div>
        <div><div className="text-2xl font-bold">{makerCheckerCommands.length}</div><p className="text-sm text-slate-500">maker-checker controls</p></div>
        <div><div className="text-2xl font-bold">{M19SecurityCompletionRows.length}</div><p className="text-sm text-slate-500">security controls</p></div>
        <div><div className="text-2xl font-bold">{M19RuntimeAbuseScenarios.length}</div><p className="text-sm text-slate-500">runtime abuse scenarios</p></div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">High-risk command registry</h2>
        <div className="mt-4">
          <DataTable<HighRiskCommandRow, unknown>
            columns={commandColumns}
            data={M19HighRiskCommandRegistry as HighRiskCommandRow[]}
            emptyTitle="No high-risk commands"
            emptyDescription="The high-risk command registry did not expose any rows."
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {M19SecurityCompletionRows.map((row) => (
          <article key={row.controlId} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{row.surface}</p>
            <h3 className="mt-1 font-semibold">{row.subject}</h3>
            <p className="mt-2 text-sm text-slate-600">{row.runtimeProof}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border bg-slate-950 p-5 text-slate-100 shadow-sm">
        <h2 className="text-xl font-semibold">Release blocker</h2>
        <p className="mt-2 text-sm text-slate-300">
          {M19SecurityCompletionManifest.name} keeps production blocked until runtime abuse, maker-checker, audit redaction, backup/restore and security smoke evidence are complete.
        </p>
      </section>
    </div>
  );
}
