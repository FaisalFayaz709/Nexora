'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';

const commands = [
  ['Submit customer invoice', '/customer-invoices/{id}/submit', 'Moves DRAFT invoice into approval flow.'],
  ['Approve customer invoice', '/customer-invoices/{id}/approve', 'Approves invoice before posting.'],
  ['Post customer invoice', '/customer-invoices/{id}/post', 'Creates balanced AR/revenue/tax journal entry.'],
  ['Send customer invoice', '/customer-invoices/{id}/send', 'Queues document/email side effects after posting.'],
  ['Run supplier three-way match', '/supplier-invoices/{id}/match', 'Compares PO, accepted GRN quantity and invoice lines.'],
  ['Approve supplier invoice', '/supplier-invoices/{id}/approve', 'Requires matchStatus=MATCHED and canonical invoice status.'],
  ['Record payment', '/payments', 'Requires Idempotency-Key and balanced allocations.'],
  ['Post journal entry', '/journal-entries/{id}/post', 'Only balanced DRAFT journals can be posted.'],
] as const;

function DataPanel({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['finance-core', endpoint], queryFn: () => apiRequest<any>(endpoint) });
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

export function FinanceCoreWorkbench() {
  const qc = useQueryClient();
  const [customerInvoiceId, setCustomerInvoiceId] = useState('');
  const [supplierInvoiceId, setSupplierInvoiceId] = useState('');
  const [journalEntryId, setJournalEntryId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(`payment-${Date.now()}`);
  const command = useMutation({
    mutationFn: ({ endpoint, key }: { endpoint: string; key?: string }) => apiRequest(endpoint, { method: 'POST', headers: key ? { 'Idempotency-Key': key } : undefined, body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-core'] }),
  });

  const runCommand = (endpoint: string) => {
    const resolved = endpoint
      .replace('{id}', endpoint.includes('supplier-invoices') ? supplierInvoiceId : endpoint.includes('journal-entries') ? journalEntryId : customerInvoiceId);
    command.mutate({ endpoint: resolved, key: endpoint === '/payments' ? idempotencyKey : undefined });
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C10</p>
        <h1 className="text-3xl font-bold">Finance Core Workbench</h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          Controls customer invoices, supplier three-way match, payment posting, journal posting, AR/AP aging and reversal-only finance corrections without moving critical money or ledger effects to async jobs.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium">Customer Invoice ID<input className="mt-1 w-full rounded-lg border p-2" value={customerInvoiceId} onChange={(event) => setCustomerInvoiceId(event.target.value)} /></label>
        <label className="text-sm font-medium">Supplier Invoice ID<input className="mt-1 w-full rounded-lg border p-2" value={supplierInvoiceId} onChange={(event) => setSupplierInvoiceId(event.target.value)} /></label>
        <label className="text-sm font-medium">Journal Entry ID<input className="mt-1 w-full rounded-lg border p-2" value={journalEntryId} onChange={(event) => setJournalEntryId(event.target.value)} /></label>
        <label className="text-sm font-medium">Payment Idempotency-Key<input className="mt-1 w-full rounded-lg border p-2" value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {commands.map(([label, endpoint, help]) => (
          <button key={label} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-blue-500" onClick={() => runCommand(endpoint)}>
            <div className="font-semibold">{label}</div>
            <div className="mt-1 text-xs text-slate-500">{help}</div>
            <div className="mt-2 font-mono text-xs text-slate-400">POST {endpoint}</div>
          </button>
        ))}
      </section>

      {command.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(command.error)}</div> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="Customer invoices" endpoint="/customer-invoices?page=1&pageSize=10" />
        <DataPanel title="Supplier invoices" endpoint="/supplier-invoices?page=1&pageSize=10" />
        <DataPanel title="Payments" endpoint="/payments?page=1&pageSize=10" />
        <DataPanel title="AR aging" endpoint="/finance/receivables?page=1&pageSize=10" />
        <DataPanel title="AP aging" endpoint="/finance/payables?page=1&pageSize=10" />
        <DataPanel title="Chart of accounts" endpoint="/accounts?page=1&pageSize=10" />
      </section>
    </div>
  );
}
