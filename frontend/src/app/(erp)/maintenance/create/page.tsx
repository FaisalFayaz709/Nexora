import { MaintenanceResourceFormPage } from '@/modules/maintenance/maintenance-resource-form-page';
import { getMaintenanceResourceConfig } from '@/modules/maintenance/maintenance-resource-config';

export default function Page() {
  return <MaintenanceResourceFormPage resource={getMaintenanceResourceConfig('plans')} mode="create" />;
}
