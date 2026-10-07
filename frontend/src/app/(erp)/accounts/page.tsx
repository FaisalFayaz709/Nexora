import { FinanceResourceList } from '@/modules/finance/finance-resource-list';
import { getFinanceResourceConfig } from '@/modules/finance/finance-resource-config';

export default function Page() {
  return <FinanceResourceList resource={getFinanceResourceConfig('accounts')} />;
}
