import {
  C17_FULL_WORKFLOW_E2E_CERTIFICATION,
  E2ECertificationScenarioCatalog,
  type E2ECertificationScenario,
} from '@nexora/shared';

const runtimeCommands = [
  'pnpm pass-c17:check',
  'pnpm architecture:check',
  'pnpm contracts:check',
  'pnpm database:check',
  'pnpm pass-c16:check',
  'pnpm docker:runtime:certify',
  'RUN_FULL_WORKFLOW_E2E=1 NEXORA_API_BASE_URL=http://localhost:3001/api/v1 pnpm full-workflow:e2e:certify',
] as const;

function ScenarioCard({ scenario }: { scenario: E2ECertificationScenario }) {
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{scenario.title}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">{scenario.scenarioId}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
          runtime blocking
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {scenario.domains.map((domain) => (
          <span key={domain} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {domain.replaceAll('_', ' ')}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required evidence</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {scenario.requiredEvidence.map((evidence) => (
              <li key={evidence}>• {evidence}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critical invariants</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {scenario.criticalInvariants.map((invariant) => (
              <li key={invariant}>• {invariant}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function FullWorkflowCertificationCenter() {
  const runtimeRequired = E2ECertificationScenarioCatalog.filter((scenario) => scenario.runtimeRequired);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[#071D3A] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">{C17_FULL_WORKFLOW_E2E_CERTIFICATION}</p>
        <h1 className="mt-3 text-3xl font-bold">Full Workflow E2E Certification</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50">
          This pass converts the accumulated ERP source into a production-blocking runtime certification matrix.
          It links seed data, backend command flows, frontend navigation, tenant/RBAC abuse checks, documents,
          workers, reports and Docker evidence into one auditable release gate.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Critical scenarios</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{E2ECertificationScenarioCatalog.length}</p>
          <p className="mt-1 text-xs text-slate-500">All must pass with zero skipped runtime scenarios.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Production blockers</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{runtimeRequired.length}</p>
          <p className="mt-1 text-xs text-slate-500">Every C17 scenario blocks production until evidence exists.</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Locked stack</h2>
          <p className="mt-2 text-lg font-bold text-slate-900">Unchanged</p>
          <p className="mt-1 text-xs text-slate-500">Next.js, Fastify, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx.</p>
        </article>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Runtime certification commands</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {runtimeCommands.map((command) => (
            <code key={command} className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {command}
            </code>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {E2ECertificationScenarioCatalog.map((scenario) => (
          <ScenarioCard key={scenario.scenarioId} scenario={scenario} />
        ))}
      </div>
    </section>
  );
}
