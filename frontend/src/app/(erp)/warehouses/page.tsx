import { EntityList } from '@/modules/masters/entity-list';
import { getBusinessMasterConfig } from '@/modules/masters/business-master-config';

export default function Page() {
  const resource = getBusinessMasterConfig('warehouses');
  return (
    <EntityList
      title={resource.title}
      endpoint={resource.endpoint}
      description={resource.description}
      columns={resource.columns}
      createPermission={resource.createPermission}
      detailRouteBase={resource.routeBase}
      editRouteBase={resource.routeBase}
      createRoute={`${resource.routeBase}/create`}
    />
  );
}
