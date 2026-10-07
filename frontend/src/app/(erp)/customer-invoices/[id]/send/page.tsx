import { FinanceResourceCommandPage } from '@/modules/finance/finance-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceCommandPage resourceKey="customer-invoices" commandKey="send-customer-invoice" recordId={params.id} />;
}
