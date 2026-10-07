import { MaintenanceResourceDetail } from '@/modules/maintenance/maintenance-resource-detail';
import { getMaintenanceResourceConfig } from '@/modules/maintenance/maintenance-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <MaintenanceResourceDetail resource={getMaintenanceResourceConfig('plans')} recordId={params.id} />;
}
