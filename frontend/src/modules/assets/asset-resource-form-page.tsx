import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { AssetResourceConfig } from './asset-resource-config';

export function AssetResourceFormPage({ resource, mode, recordId }: { resource: AssetResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode={mode} definition={definition} recordId={recordId} backHref={resource.routeBase} detailHref={resource.routeBase} />;
}

export function RegisterAssetFromStockPage() {
  const definition = getResourceFormDefinition('/assets/register-from-stock', 'Register Asset From Stock');
  return <ResourceFormPage mode="create" definition={definition} backHref="/assets" detailHref="/assets" />;
}
