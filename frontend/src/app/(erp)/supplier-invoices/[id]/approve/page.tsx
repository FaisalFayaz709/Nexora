import { FinanceResourceCommandPage } from '@/modules/finance/finance-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceCommandPage resourceKey="supplier-invoices" commandKey="approve-supplier-invoice" recordId={params.id} />;
}
