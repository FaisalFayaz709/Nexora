import { ServiceResourceFormPage } from '@/modules/service/service-resource-form-page';
import { getServiceResourceConfig } from '@/modules/service/service-resource-config';

export default function Page() {
  return <ServiceResourceFormPage resource={getServiceResourceConfig('tickets')} mode="create" />;
}
