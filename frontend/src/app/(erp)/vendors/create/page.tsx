import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import { getBusinessMasterConfig } from '@/modules/masters/business-master-config';

export default function Page() {
  const resource = getBusinessMasterConfig('vendors');
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode="create" definition={definition} backHref={resource.routeBase} detailHref={resource.routeBase} requiredPermission={resource.createPermission} />;
}
