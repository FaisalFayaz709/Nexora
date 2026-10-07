import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

const customer = ['projects', 'contracts', 'sites', 'assets', 'tickets', 'invoices', 'payments', 'documents'];
const vendor = ['rfqs', 'quotations', 'purchase-orders', 'deliveries', 'invoices', 'payments', 'performance', 'documents'];

export function PortalCompletionWorkbench() {
  return (
    <main className="space-y-6">
      <Card><CardHeader><CardTitle>Customer and Vendor Portal Completion</CardTitle><CardDescription>Pass R16 adds linked-record detail pages for both PortalShell portal shells. Portal users are restricted to their linked customer/vendor identities and cannot access internal ERP navigation.</CardDescription></CardHeader></Card>
      <section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Customer portal pages</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground">{customer.map((item) => <li key={item}><a href={`/customer-portal/${item}`}>/customer-portal/{item}</a></li>)}</ul></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Vendor portal pages</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground">{vendor.map((item) => <li key={item}><a href={`/vendor-portal/${item}`}>/vendor-portal/{item}</a></li>)}</ul></CardContent></Card></section>
      <Card><CardHeader><CardTitle className="text-base">Runtime proof still required</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Cross-tenant denial, linked-customer/vendor filtering, authorized document download and portal route shell behavior must be proven by R18-R21 runtime/E2E gates.</p></CardContent></Card>
    </main>
  );
}
