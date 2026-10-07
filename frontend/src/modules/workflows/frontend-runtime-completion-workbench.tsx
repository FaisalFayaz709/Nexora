'use client';

import {
  FrontendRuntimeBrowserCertificationRoles,
  FrontendRuntimeCompletionManifest,
  FrontendRuntimeCompletionRows,
  FrontendRuntimeRouteCoverage,
  MISSING_PASS_M18_SOURCE_PREFLIGHT_FRONTEND_RUNTIME_UX_RBAC,
} from '@nexora/shared';
import { useAuth } from '../auth/auth-provider';
import { FrontendNavigationRegistry, filterNavigationByM18Scope } from '../navigation/navigation-registry';

const enabledAll = new Map(FrontendNavigationRegistry.map((item) => [item.moduleKey, true]));

export function FrontendRuntimeCompletionWorkbench() {
  const auth = useAuth();
  const visible = filterNavigationByM18Scope(enabledAll, auth.permissions);
  const denied = FrontendNavigationRegistry.length - visible.length;

  return (
    <div className="space-y-8" data-pass="M18" data-marker={MISSING_PASS_M18_SOURCE_PREFLIGHT_FRONTEND_RUNTIME_UX_RBAC}>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Missing Pass M18</p>
        <h1 className="text-3xl font-bold text-slate-900">Frontend Runtime UX, RBAC & Workflow Completion</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          This surface certifies the frontend side of the ERP workflow: permission-scoped navigation, tenant context, guarded command buttons, idempotency headers, query invalidation, upload-intent evidence and safe portal/PWA/offline user journeys. Frontend gates improve usability only; backend authorization remains authoritative.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-2xl font-bold">{FrontendNavigationRegistry.length}</div><div className="text-xs text-slate-500">registered nav routes</div></div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-2xl font-bold">{visible.length}</div><div className="text-xs text-slate-500">visible for current permissions</div></div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-2xl font-bold">{denied}</div><div className="text-xs text-slate-500">hidden by permission gate</div></div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-2xl font-bold">{FrontendRuntimeBrowserCertificationRoles.length}</div><div className="text-xs text-slate-500">roles needing browser proof</div></div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Locked M18 controls</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {FrontendRuntimeCompletionManifest.rows.map((row) => (
            <div key={row.controlId} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              <div className="font-mono text-[11px] text-blue-700">{row.controlId}</div>
              <div className="mt-1 font-semibold">{row.subject}</div>
              <div className="mt-1 text-slate-500">{row.runtimeProof}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Current role navigation evidence</h2>
        <p className="mt-1 text-sm text-slate-600">The app shell uses the same registry and hides module links by feature flag plus required permission.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {visible.map((item) => (
            <div key={item.href} className="rounded-xl border p-3 text-sm">
              <div className="font-semibold text-slate-900">{item.label}</div>
              <div className="font-mono text-xs text-slate-500">{item.href}</div>
              <div className="mt-1 text-xs text-slate-500">{item.requiredPermission}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Route coverage that still needs browser certification</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FrontendRuntimeRouteCoverage.map((route) => <span key={route} className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600">{route}</span>)}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        M18 is a source-preflight readiness surface. Final pass requires real browser testing across every seeded role with live API responses, denied direct routes, mutation invalidation and no leaked unauthorized identifiers.
      </section>
    </div>
  );
}
