import { ProcurementResourceDetail } from '@/modules/procurement/procurement-resource-detail';
import { getProcurementResourceConfig } from '@/modules/procurement/procurement-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ProcurementResourceDetail resource={getProcurementResourceConfig('rfqs')} recordId={params.id} />;
}
