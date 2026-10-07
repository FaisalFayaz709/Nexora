import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { ProcurementResourceConfig } from './procurement-resource-config';

export function ProcurementResourceFormPage({ resource, mode, recordId }: { resource: ProcurementResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  const requiredPermission = mode === 'edit' ? resource.updatePermission : resource.createPermission;
  return (
    <ResourceFormPage
      mode={mode}
      definition={definition}
      recordId={recordId}
      backHref={resource.routeBase}
      detailHref={resource.routeBase}
      requiredPermission={requiredPermission}
    />
  );
}
