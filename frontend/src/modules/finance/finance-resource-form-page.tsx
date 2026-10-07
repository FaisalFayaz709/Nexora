import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { FinanceResourceConfig } from './finance-resource-config';

export function FinanceResourceFormPage({ resource, mode, recordId }: { resource: FinanceResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode={mode} definition={definition} recordId={recordId} backHref={resource.routeBase} detailHref={resource.routeBase} />;
}
