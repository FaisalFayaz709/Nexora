import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { EntityList } from '@/modules/masters/entity-list';
import { MaintenanceCompletionPrinciples, type MaintenanceResourceConfig } from './maintenance-resource-config';

export function MaintenanceResourceList({ resource }: { resource: MaintenanceResourceConfig }) {
  return (
    <section className="space-y-6">
      <EntityList
        title={resource.title}
        endpoint={resource.endpoint}
        description={resource.description}
        columns={[...resource.columns]}
        createLabel={`Create ${resource.singularTitle}`}
        createPermission={resource.createPermission}
        detailRouteBase={resource.routeBase}
        editRouteBase={resource.updatePermission ? resource.routeBase : undefined}
        createRoute={resource.createPermission ? `${resource.routeBase}/create` : undefined}
      />
      <Card>
        <CardHeader><CardTitle className="text-base">Maintenance workflow controls</CardTitle><CardDescription>R14 makes maintenance plans, schedules and execution commands visible as complete frontend surfaces.</CardDescription></CardHeader>
        <CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{MaintenanceCompletionPrinciples.map((item) => <li key={item}>{item}</li>)}</ul></CardContent>
      </Card>
    </section>
  );
}
