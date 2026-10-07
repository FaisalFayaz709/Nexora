import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import type { ProjectResourceConfig } from './project-resource-config';

export function ProjectResourceFormPage({ resource, mode, recordId }: { resource: ProjectResourceConfig; mode: 'create' | 'edit'; recordId?: string }) {
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode={mode} definition={definition} recordId={recordId} backHref={resource.routeBase} detailHref={resource.routeBase} />;
}
