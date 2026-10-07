import { ServiceResourceDetail } from '@/modules/service/service-resource-detail';
import { getServiceResourceConfig } from '@/modules/service/service-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ServiceResourceDetail resource={getServiceResourceConfig('tickets')} recordId={params.id} />;
}
