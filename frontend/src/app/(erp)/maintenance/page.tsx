import { MaintenanceResourceList } from '@/modules/maintenance/maintenance-resource-list';
import { getMaintenanceResourceConfig } from '@/modules/maintenance/maintenance-resource-config';

export default function MaintenancePlansPage() {
  return <MaintenanceResourceList resource={getMaintenanceResourceConfig('plans')} />;
}
