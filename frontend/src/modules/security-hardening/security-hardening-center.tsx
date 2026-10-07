'use client';

import { useMemo } from 'react';
import {
  C16_SECURITY_HARDENING,
  SecurityHardeningEvidenceCatalog,
  type SecurityHardeningEvidence,
} from '@nexora/shared';

const runtimeCommands = [
  'pnpm architecture:check',
  'pnpm contracts:check',
  'pnpm pass-c16:check',
  'pnpm audit --audit-level high',
  'pnpm db:validate && pnpm db:generate',
  'RUN_INTEGRATION_TESTS=1 SECURITY_SMOKE=1 pnpm test',
  'pnpm docker:runtime:certify',
] as const;

function Badge({ item }: { item: SecurityHardeningEvidence }) {
  return (
    <span className={item.runtimeRequired ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700' : 'rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'}>
      {item.runtimeRequired ? 'runtime required' : 'CI/static'}
    </span>
  );
}

export function SecurityHardeningCenter() {
  const blockingControls = useMemo(
    () => SecurityHardeningEvidenceCatalog.filter((item) => item.blocksProduction),
    [],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[#071D3A] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">{C16_SECURITY_HARDENING}</p>
        <h1 className="mt-3 text-3xl font-bold">Security Hardening Center</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50">
          This pass is a production-blocking security gate. It brings authentication, authorization,
          tenant isolation, upload abuse controls, CSRF/header policy, supply-chain checks, backup/restore
          evidence and runtime security smoke testing into one release checklist.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Blocking controls</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{blockingControls.length}</p>
          <p className="mt-1 text-xs text-slate-500">All C16 controls block production until evidence exists.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Runtime suites</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">8</p>
          <p className="mt-1 text-xs text-slate-500">Auth, IDOR, privilege, upload, CSRF, injection, audit and backup restore.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Locked stack</h2>
          <p className="mt-2 text-lg font-bold text-slate-900">Unchanged</p>
          <p className="mt-1 text-xs text-slate-500">Next.js, Fastify, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx.</p>
        </article>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Security release commands</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {runtimeCommands.map((command) => (
            <code key={command} className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {command}
            </code>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {SecurityHardeningEvidenceCatalog.map((item) => (
          <article key={item.controlId} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">{item.area.replaceAll('_', ' ')}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{item.controlId}</p>
              </div>
              <Badge item={item} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Owner: {item.owner}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {item.requiredEvidence.map((evidence) => (
                <li key={evidence} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{evidence}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
