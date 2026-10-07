'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { FinanceCompletionPrinciples, FinanceResourceConfigs, FinanceScopedSurfaceConfigs } from './finance-resource-config';

const lifecycle = [
  { id: 'ar', title: 'Customer invoice lifecycle', description: 'Draft invoice is submitted, approved, posted to journal, sent through queued PDF/email and settled by idempotent payment allocation.' },
  { id: 'ap', title: 'Supplier invoice lifecycle', description: 'AP invoice is created from vendor/PO/GRN evidence, matched using PO + GRN + Supplier Invoice, approved and paid through allocation/voucher controls.' },
  { id: 'cash', title: 'Bank and cash controls', description: 'Bank accounts, imported statements, vouchers, cheque data and reconciliation close remain backend-audited finance workflows.' },
  { id: 'tax', title: 'Tax engine', description: 'Tax is deterministically calculated and stored at transaction time; rule changes do not rewrite historical transactions.' },
  { id: 'journal', title: 'Journal and reversal model', description: 'Balanced journal entries are posted once and corrected by reversal, not destructive edit.' },
];

export function FinanceCompletionWorkbench() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass R15</p>
        <h1 className="text-3xl font-bold">Finance Frontend Completion</h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          Completes the frontend source surfaces for invoices, supplier three-way match, payments, expenses, accounts, journal entries, tax, vouchers, bank/cash, reconciliation and AR/AP aging without changing the locked Fastify /api/v1 finance backend.
        </p>
      </header>

      <Tabs
        defaultId="principles"
        items={[
          {
            id: 'principles',
            label: 'Locked principles',
            content: <Card><CardHeader><CardTitle>Finance completion principles</CardTitle><CardDescription>R15 keeps finance, money, tax and journal state backend-authoritative.</CardDescription></CardHeader><CardContent><AuditTimeline items={FinanceCompletionPrinciples.map((description, index) => ({ id: `principle-${index}`, title: description, description: 'Required by the R15 finance frontend completion gate.' }))} /></CardContent></Card>,
          },
          {
            id: 'resources',
            label: 'Resource surfaces',
            content: <Card><CardHeader><CardTitle>Finance resources</CardTitle><CardDescription>Each resource has list/create/detail/edit support only where the locked backend exposes it.</CardDescription></CardHeader><CardContent><ActivityTimeline items={Object.values(FinanceResourceConfigs).map((resource) => ({ id: resource.key, title: resource.title, description: `${resource.description} Route: ${resource.routeBase}. Endpoint: ${resource.endpoint}.` }))} /></CardContent></Card>,
          },
          {
            id: 'commands',
            label: 'Command surfaces',
            content: <Card><CardHeader><CardTitle>Command and read-model entry points</CardTitle><CardDescription>These screens use explicit Fastify endpoints, RHF/Zod command forms and centralized TanStack Query invalidation.</CardDescription></CardHeader><CardContent><ActivityTimeline items={Object.values(FinanceScopedSurfaceConfigs).map((surface) => ({ id: surface.key, title: surface.title, description: `${surface.description} Endpoint: ${surface.endpointTemplate}.` }))} /></CardContent></Card>,
          },
          {
            id: 'lifecycle',
            label: 'Lifecycle controls',
            content: <Card><CardHeader><CardTitle>End-to-end finance controls</CardTitle><CardDescription>Operational records become reliable accounting/reporting evidence.</CardDescription></CardHeader><CardContent><ActivityTimeline items={lifecycle} /></CardContent></Card>,
          },
        ]}
      />
    </main>
  );
}
