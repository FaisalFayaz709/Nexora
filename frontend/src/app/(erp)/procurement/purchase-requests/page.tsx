import { ProcurementResourceList } from '@/modules/procurement/procurement-resource-list';
import { getProcurementResourceConfig } from '@/modules/procurement/procurement-resource-config';

export default function Page() {
  return <ProcurementResourceList resource={getProcurementResourceConfig('purchase-requests')} />;
}
