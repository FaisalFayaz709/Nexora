import { MaintenanceResourceFormPage } from '@/modules/maintenance/maintenance-resource-form-page';
import { getMaintenanceResourceConfig } from '@/modules/maintenance/maintenance-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <MaintenanceResourceFormPage resource={getMaintenanceResourceConfig('plans')} mode="edit" recordId={params.id} />;
}
