import { ProcurementResourceFormPage } from '@/modules/procurement/procurement-resource-form-page';
import { getProcurementResourceConfig } from '@/modules/procurement/procurement-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ProcurementResourceFormPage resource={getProcurementResourceConfig('purchase-requests')} mode="edit" recordId={params.id} />;
}
