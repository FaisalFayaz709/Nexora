import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { MaintenanceResourceConfig } from './maintenance-resource-config';

export function MaintenanceResourceFormPage({ resource, mode, recordId }: { resource: MaintenanceResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode={mode} definition={definition} recordId={recordId} backHref={resource.routeBase} detailHref={resource.routeBase} />;
}
