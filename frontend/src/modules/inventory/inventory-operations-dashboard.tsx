import Link from 'next/link';
import { InventoryCompletionPrinciples } from './inventory-resource-config';

const operations = [
  { title: 'Products', href: '/inventory/products', body: 'Inventory item masters with SKU, category, UOM, tracking type, cost metadata and stock thresholds.' },
  { title: 'Product Categories', href: '/inventory/product-categories', body: 'Product taxonomy for inventory reporting, procurement grouping and import onboarding.' },
  { title: 'Warehouses', href: '/inventory/warehouses', body: 'Branch-scoped warehouses that own balances, stock counts and transfer sources/destinations.' },
  { title: 'Warehouse Locations', href: '/inventory/warehouse-locations', body: 'Zone, rack, shelf and bin hierarchy for precise stock ledger and balance locations.' },
  { title: 'Stock Balances', href: '/inventory/stock', body: 'Tenant and branch-scoped on-hand, reserved and available stock by warehouse, location and product.' },
  { title: 'Immutable Stock Ledger', href: '/inventory/ledger', body: 'Append-only movement history for receipts, transfers, issues, returns, damaged stock and adjustments.' },
  { title: 'Reservations', href: '/inventory/reservations', body: 'Project reservations that lock free stock and prevent another project from consuming committed material.' },
  { title: 'Stock Transfers', href: '/inventory/transfers', body: 'Draft, dispatch and receive warehouse transfers with serial and batch traceability.' },
  { title: 'Stock Adjustments', href: '/inventory/adjustments', body: 'Controlled correction flow for warehouse variances, with approval-ready audit and ledger posting.' },
  { title: 'Stock Counts', href: '/inventory/stock-counts', body: 'Physical/cycle count workflow with stock freeze, counted quantity capture, variance approval and posting.' },
  { title: 'Serial Lookup', href: '/inventory/serials', body: 'Find serialized units and trace their warehouse, status, asset link and movement history.' },
] as const;

export function InventoryOperationsDashboard() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pass R11</p>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory Frontend Completion</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Inventory remains transaction-based, not simple add/edit/delete product screens. R11 completes the frontend screen family for products, categories, warehouses, locations, balances, ledger, reservations, transfers, adjustments, stock counts and serial lookup without violating Fastify /api/v1 ownership.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {operations.map((operation) => (
          <Link key={operation.href} href={operation.href} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">{operation.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{operation.body}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">R11 locked inventory principles</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          {InventoryCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
        </ul>
      </div>
    </section>
  );
}
