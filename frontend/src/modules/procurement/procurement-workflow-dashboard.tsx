import Link from 'next/link';
import { ProcurementCompletionPrinciples, ProcurementResourceConfigs } from './procurement-resource-config';

const workflow = [
  {
    title: '1. Purchase Request',
    href: ProcurementResourceConfigs['purchase-requests'].routeBase,
    actions: ['Create PR with RHF/Zod', 'Submit for approval', 'Approve or reject', 'Convert approved PR to RFQ'],
  },
  {
    title: '2. RFQ and Vendor Quotations',
    href: ProcurementResourceConfigs.rfqs.routeBase,
    actions: ['Invite approved vendors', 'Publish RFQ', 'Record supplier quotations', 'Compare cost, delivery and warranty'],
  },
  {
    title: '3. Supplier Selection and PO',
    href: ProcurementResourceConfigs['purchase-orders'].routeBase,
    actions: ['Select supplier quotation', 'Create PO from selected quote', 'Submit PO', 'Approve/send/cancel PO'],
  },
  {
    title: '4. Goods Receipt and Inspection',
    href: ProcurementResourceConfigs['goods-receipts'].routeBase,
    actions: ['Receive goods with idempotency key', 'Capture serials/batches', 'Post stock ledger transactionally', 'Inspect GRN'],
  },
  {
    title: '5. Commercial procurement extensions',
    href: ProcurementResourceConfigs['purchase-contracts'].routeBase,
    actions: ['Vendor onboarding and risk', 'Purchase contracts / blanket PO', 'Release order', 'Landed cost capture and posting'],
  },
];

const controls = [
  'RFQ requires APPROVED purchase request.',
  'Unapproved or blacklisted vendors are blocked before RFQ/quotation/PO/payment use.',
  'Selected supplier quotation is required before PO creation.',
  'PO approval is maker-checker controlled through the approval engine.',
  'GRN creates PO received quantities, stock ledger, serial/batch movement, audit and event in one transaction.',
  'Supplier invoice matching source is PO + GRN and is exposed to finance for three-way match.',
  'Landed cost posting updates inventory/project costing and is not async source-of-truth.',
  'All frontend screens use route-group shell, TanStack Table, React Hook Form/Zod forms and centralized Fastify API calls.',
];

export function ProcurementWorkflowDashboard() {
  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pass R12</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Procurement Frontend Completion</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Complete the blueprint procurement path from material requirement and purchase request through approval, RFQ, supplier quotation,
          supplier comparison, selected quotation, purchase order, goods receipt, inspection, stock posting, landed cost and finance matching source.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {workflow.map((stage) => (
          <Link key={stage.title} href={stage.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md">
            <h2 className="font-semibold text-slate-900">{stage.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {stage.actions.map((action) => (
                <li key={action} className="flex gap-2">
                  <span aria-hidden="true">→</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Locked compliance controls</h2>
        <ul className="mt-4 grid gap-2 text-sm text-slate-600 lg:grid-cols-2">
          {controls.map((control) => (
            <li key={control} className="rounded-xl bg-slate-50 p-3">{control}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">R12 implementation principles</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {ProcurementCompletionPrinciples.map((principle) => <li key={principle}>• {principle}</li>)}
        </ul>
      </div>
    </section>
  );
}
