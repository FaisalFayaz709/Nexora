import { ProcurementResourceFormPage } from '@/modules/procurement/procurement-resource-form-page';
import { getProcurementResourceConfig } from '@/modules/procurement/procurement-resource-config';

export default function Page() {
  return <ProcurementResourceFormPage resource={getProcurementResourceConfig('supplier-quotations')} mode="create" />;
}
