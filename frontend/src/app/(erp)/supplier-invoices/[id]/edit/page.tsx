import { FinanceResourceFormPage } from '@/modules/finance/finance-resource-form-page';
import { getFinanceResourceConfig } from '@/modules/finance/finance-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <FinanceResourceFormPage resource={getFinanceResourceConfig('supplier-invoices')} mode="edit" recordId={params.id} />;
}
