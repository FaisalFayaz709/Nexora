import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { InventoryResourceConfig } from './inventory-resource-config';

export function InventoryResourceFormPage({ resource, mode, recordId }: { resource: InventoryResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode={mode} definition={definition} recordId={recordId} backHref={resource.routeBase} detailHref={resource.routeBase} />;
}
