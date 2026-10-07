import { M22ProductionGoNoGoManifest, M22ProductionGateCatalog } from '@nexora/shared';

export function M22ProductionGoNoGoWorkbench() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[#071D3A] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Missing Pass M22</p>
        <h1 className="mt-3 text-3xl font-bold">Production Go/No-Go Final Evidence Gate</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50">
          This read-only workbench keeps the final release decision on HOLD until all runtime evidence, owner approvals,
          rollback readiness, post-deployment smoke plans and locked-spec compliance proofs are attached.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Final gates</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{M22ProductionGateCatalog.length}</p>
          <p className="mt-1 text-xs text-slate-500">Every gate blocks production.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Decision default</h2>
          <p className="mt-2 text-lg font-bold text-slate-900">HOLD</p>
          <p className="mt-1 text-xs text-slate-500">{M22ProductionGoNoGoManifest.decisionDefault}</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Locked stack</h2>
          <p className="mt-2 text-lg font-bold text-slate-900">Zero deviation</p>
          <p className="mt-1 text-xs text-slate-500">Frontend only reads evidence; it does not execute deployment.</p>
        </article>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mandatory command chain</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {M22ProductionGoNoGoManifest.mandatoryCommandChain.map((command) => (
            <code key={command} className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {command}
            </code>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {M22ProductionGoNoGoManifest.gates.map((gate) => (
          <article key={gate.gateId} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{gate.title}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{gate.gateId}</p>
              </div>
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">production blocking</span>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{gate.domain.replaceAll('_', ' ')}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required evidence</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {gate.requiredEvidence.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocking conditions</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {gate.blockingConditions.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
