import { M20FullLifecycleManifest } from '@nexora/shared';

export function M20FullLifecycleCompletionWorkbench() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Missing Pass M20</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Full Lifecycle E2E Runtime Certification</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This workbench is read-only evidence guidance for the locked customer → contract → project → procurement → inventory → asset → service → maintenance → finance lifecycle. It must not call database, Prisma, storage, queue, or server internals directly.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {M20FullLifecycleManifest.rows.map((row) => (
          <article key={row.controlId} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.segment}</p>
            <h2 className="mt-2 font-semibold text-slate-950">{row.controlId}</h2>
            <p className="mt-2 text-sm text-slate-600">Scenario: {row.scenarioId}</p>
            <p className="mt-2 text-sm text-slate-600">Evidence: {row.requiredEvidence.join(', ')}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
