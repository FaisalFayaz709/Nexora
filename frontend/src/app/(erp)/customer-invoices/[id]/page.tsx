import { FinanceResourceDetail } from '@/modules/finance/finance-resource-detail';
import { getFinanceResourceConfig } from '@/modules/finance/finance-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceDetail resource={getFinanceResourceConfig('customer-invoices')} recordId={params.id} />;
}
