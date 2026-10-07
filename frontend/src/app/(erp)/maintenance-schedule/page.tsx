import { MaintenanceResourceList } from '@/modules/maintenance/maintenance-resource-list';
import { getMaintenanceResourceConfig } from '@/modules/maintenance/maintenance-resource-config';

export default function MaintenanceSchedulePage() {
  return <MaintenanceResourceList resource={getMaintenanceResourceConfig('schedule')} />;
}
