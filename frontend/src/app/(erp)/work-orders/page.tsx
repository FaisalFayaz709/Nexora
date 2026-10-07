import { ServiceResourceList } from '@/modules/service/service-resource-list';
import { getServiceResourceConfig } from '@/modules/service/service-resource-config';

export default function WorkOrdersPage() {
  return <ServiceResourceList resource={getServiceResourceConfig('work-orders')} />;
}
