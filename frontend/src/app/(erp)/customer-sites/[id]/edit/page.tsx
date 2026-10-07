import { ResourceFormPage } from '@/components/forms';
import { getResourceFormDefinition } from '@/modules/forms';
import { getBusinessMasterConfig } from '@/modules/masters/business-master-config';

export default function Page({ params }: { params: { id: string } }) {
  const resource = getBusinessMasterConfig('customer-sites');
  const definition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  return <ResourceFormPage mode="edit" definition={definition} recordId={params.id} backHref={resource.routeBase} detailHref={resource.routeBase} requiredPermission={resource.updatePermission} />;
}
