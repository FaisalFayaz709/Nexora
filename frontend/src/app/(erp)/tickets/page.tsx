import { ServiceResourceList } from '@/modules/service/service-resource-list';
import { getServiceResourceConfig } from '@/modules/service/service-resource-config';

export default function TicketsPage() {
  return <ServiceResourceList resource={getServiceResourceConfig('tickets')} />;
}
