import { EntityList } from '@/modules/masters/entity-list';
import type { PlatformResourceConfig } from './platform-resource-config';

export function PlatformResourceList({ resource }: { resource: PlatformResourceConfig }) {
  return (
    <EntityList
      title={resource.title}
      endpoint={resource.endpoint}
      description={resource.description}
      columns={[...resource.columns]}
      createLabel={resource.createSupported ? `Create ${resource.singularTitle}` : 'Create disabled'}
      createPermission={resource.createPermission}
      detailRouteBase={resource.detailSupported ? resource.routeBase : undefined}
      editRouteBase={resource.editSupported ? resource.routeBase : undefined}
      createRoute={resource.createSupported && resource.createPermission ? `${resource.routeBase}/create` : undefined}
      initialFilters={resource.initialFilters}
    />
  );
}
