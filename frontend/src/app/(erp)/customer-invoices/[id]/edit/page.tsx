import { FinanceResourceFormPage } from '@/modules/finance/finance-resource-form-page';
import { getFinanceResourceConfig } from '@/modules/finance/finance-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceFormPage resource={getFinanceResourceConfig('customer-invoices')} mode="edit" recordId={params.id} />;
}
