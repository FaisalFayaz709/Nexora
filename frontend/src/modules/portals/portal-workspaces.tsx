'use client';

const customerItems = [
  'Dashboard with project, contract and invoice summary',
  'My Projects, Sites, Assets and QR-linked service history',
  'Ticket submission, work-order status and completed-work approval',
  'Invoices, payments, warranties and authorized documents',
];

const vendorItems = [
  'New RFQs, supplier quotation submission and quotation history',
  'Purchase orders, delivery schedule, GRNs and rejected items',
  'Supplier invoices, payments, performance and authorized documents',
  'Vendor actions remain linked-vendor scoped and auditable',
];

const technicianItems = [
  'My jobs, assigned work orders and technician-only status commands',
  'Scan Asset QR with authenticated authorization after token resolution',
  'Navigation, check-in/check-out, GPS policy, photos and customer signature',
  'Offline command queue with idempotent tenant-scoped replay',
];

function Panel({ title, items, note }: { title: string; items: string[]; note: string }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function PortalWorkspaces() {
  return (
    <main className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pass C14</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Customer Portal, Vendor Portal and Technician PWA</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Portal users do not receive broad ERP access. Each surface is filtered by authenticated tenant context and a linked customer, linked vendor or assigned technician employee. QR tokens, document URLs and offline commands never bypass authorization.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Customer Portal" items={customerItems} note="Customer users see only their linked customer records, service history and commercial documents." />
        <Panel title="Vendor Portal" items={vendorItems} note="Vendor users can respond to sourcing and delivery workflows only for their linked supplier account." />
        <Panel title="Technician PWA" items={technicianItems} note="Technicians execute assigned field jobs with document-backed proof, signatures and offline-safe replay." />
      </div>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Runtime gate: prove cross-tenant denial, linked-customer/vendor filtering, assigned-technician-only commands, QR authorization, Document/StorageService evidence and idempotent offline replay through executable tests.
      </section>
    </main>
  );
}
