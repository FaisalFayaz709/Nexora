import { FinanceResourceFormPage } from '@/modules/finance/finance-resource-form-page';
import { getFinanceResourceConfig } from '@/modules/finance/finance-resource-config';

export default function Page() {
  return <FinanceResourceFormPage resource={getFinanceResourceConfig('payments')} mode="create" />;
}
