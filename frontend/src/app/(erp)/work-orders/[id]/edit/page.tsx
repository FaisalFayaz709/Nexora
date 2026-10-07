import { ServiceResourceFormPage } from '@/modules/service/service-resource-form-page';
import { getServiceResourceConfig } from '@/modules/service/service-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ServiceResourceFormPage resource={getServiceResourceConfig('work-orders')} mode="edit" recordId={params.id} />;
}
