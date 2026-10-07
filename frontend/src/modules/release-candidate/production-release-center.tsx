import {
  C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE,
  ProductionReleaseCommandChain,
  ProductionReleaseGateCatalog,
  type ProductionReleaseGate,
} from '@nexora/shared';

function ReleaseGateCard({ gate }: { gate: ProductionReleaseGate }) {
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{gate.title}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">{gate.gateId}</p>
        </div>
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          production blocking
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {gate.areas.map((area) => (
          <span key={area} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {area.replaceAll('_', ' ')}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required evidence</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {gate.requiredEvidence.map((evidence) => (
              <li key={evidence}>• {evidence}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocking conditions</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {gate.blockingConditions.map((condition) => (
              <li key={condition}>• {condition}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function ProductionReleaseCenter() {
  const runtimeBlocking = ProductionReleaseGateCatalog.filter((gate) => gate.runtimeRequired && gate.blocksProduction);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[#071D3A] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">{C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE}</p>
        <h1 className="mt-3 text-3xl font-bold">Production Deployment / Release Candidate</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50">
          This pass converts the certified source into a production release-candidate control center. It keeps the locked
          stack unchanged and blocks production until reproducible install, migrations, Docker runtime, E2E/security evidence,
          backup/restore, observability, rollback and owner approval evidence are attached.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Release gates</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{ProductionReleaseGateCatalog.length}</p>
          <p className="mt-1 text-xs text-slate-500">Every gate is production-blocking.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Runtime required</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{runtimeBlocking.length}</p>
          <p className="mt-1 text-xs text-slate-500">No source-only sign-off is allowed.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Decision</h2>
          <p className="mt-2 text-lg font-bold text-slate-900">HOLD until evidence</p>
          <p className="mt-1 text-xs text-slate-500">Go only after zero failed/skipped critical scenarios.</p>
        </article>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Production certification command chain</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {ProductionReleaseCommandChain.map((command) => (
            <code key={command} className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {command}
            </code>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {ProductionReleaseGateCatalog.map((gate) => (
          <ReleaseGateCard key={gate.gateId} gate={gate} />
        ))}
      </div>
    </section>
  );
}
