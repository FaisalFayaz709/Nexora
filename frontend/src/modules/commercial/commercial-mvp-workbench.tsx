'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';

const commercialLists = [
  ['Number sequences', '/number-sequences?page=1&pageSize=10'],
  ['Vendor onboarding', '/vendor-onboarding/requests?page=1&pageSize=10'],
  ['Tax codes', '/tax-codes?page=1&pageSize=10'],
  ['Bank accounts', '/bank-accounts?page=1&pageSize=10'],
  ['Data import batches', '/imports?page=1&pageSize=10'],
] as const;

const commercialCommands = [
  ['Validate import batch', '/imports/{importId}/validate', 'P0 data import validation before commit.'],
  ['Commit import batch', '/imports/{importId}/commit', 'P0 transactional/controlled import commit with audit traceability.'],
  ['Rollback import batch', '/imports/{importId}/rollback', 'P0 rollback policy for committed import batches.'],
  ['Start stock count', '/stock-counts/{stockCountId}/start', 'P1 stock scope freeze before physical count.'],
  ['Submit stock count', '/stock-counts/{stockCountId}/submit', 'P1 counted quantities and variances.'],
  ['Post stock count', '/stock-counts/{stockCountId}/post', 'P1 maker-checker variance posting and stock ledger.'],
  ['Calculate tax preview', '/tax/calculate', 'P1 deterministic tax preview before posting.'],
  ['Close bank reconciliation', '/bank-reconciliations/{reconciliationId}/close', 'P1 matched statement lines and audit closure.'],
  ['Create receipt voucher', '/vouchers/receipt', 'P1 receipt voucher posts bank/cash collection and journal evidence.'],
  ['Approve vendor onboarding', '/vendor-onboarding/{vendorOnboardingId}/approve', 'P2 vendor governance before procurement/payment.'],
  ['Blacklist vendor', '/vendors/{vendorId}/blacklist', 'P2 risk gate blocks unsafe vendors.'],
  ['Allocate landed cost', '/landed-costs/{landedCostId}/allocate', 'P2 reconcile landed cost allocations.'],
  ['Post landed cost', '/landed-costs/{landedCostId}/post', 'P2 idempotent inventory valuation update.'],
  ['Approve purchase contract', '/purchase-contracts/{purchaseContractId}/approve', 'P2 blanket PO contract approval.'],
  ['Create release order', '/purchase-contracts/{purchaseContractId}/create-release-order', 'P2 validates remaining quantity/value.'],
] as const;

function DataPanel({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['commercial-mvp', endpoint], queryFn: () => apiRequest<any>(endpoint) });
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Source: {endpoint}</p>
      <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function CommercialMvpWorkbench() {
  const qc = useQueryClient();
  const [ids, setIds] = useState({ importId: '', stockCountId: '', reconciliationId: '', vendorOnboardingId: '', vendorId: '', landedCostId: '', purchaseContractId: '' });
  const [idempotencyKey, setIdempotencyKey] = useState(`c11-${Date.now()}`);

  const command = useMutation({
    mutationFn: ({ endpoint }: { endpoint: string }) => apiRequest(endpoint, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commercial-mvp'] }),
  });

  const resolveEndpoint = (endpoint: string) => endpoint
    .replace('{importId}', ids.importId)
    .replace('{stockCountId}', ids.stockCountId)
    .replace('{reconciliationId}', ids.reconciliationId)
    .replace('{vendorOnboardingId}', ids.vendorOnboardingId)
    .replace('{vendorId}', ids.vendorId)
    .replace('{landedCostId}', ids.landedCostId)
    .replace('{purchaseContractId}', ids.purchaseContractId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C11</p>
        <h1 className="text-3xl font-bold">Commercial MVP Additions Workbench</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          Completes the addendum priority controls: Number Sequence and Import Wizard as P0, Stock Count, Tax Engine and Bank/Cash as P1, Vendor Risk, Landed Cost and Purchase Contracts as P2. Critical finance, stock, import and governance changes stay transactional; queues remain for documents, notifications, exports and webhooks.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        {Object.entries(ids).map(([key, value]) => (
          <label className="text-sm font-medium" key={key}>{key}<input className="mt-1 w-full rounded-lg border p-2" value={value} onChange={(event) => setIds({ ...ids, [key]: event.target.value })} /></label>
        ))}
        <label className="text-sm font-medium">Idempotency-Key<input className="mt-1 w-full rounded-lg border p-2" value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commercialCommands.map(([label, endpoint, help]) => (
          <button key={label} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => command.mutate({ endpoint: resolveEndpoint(endpoint) })}>
            <div className="font-semibold">{label}</div>
            <div className="mt-1 text-xs text-slate-500">{help}</div>
            <div className="mt-2 font-mono text-xs text-slate-400">POST {endpoint}</div>
          </button>
        ))}
      </section>

      {command.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(command.error)}</div> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {commercialLists.map(([title, endpoint]) => <DataPanel key={endpoint} title={title} endpoint={endpoint} />)}
      </section>
    </div>
  );
}
