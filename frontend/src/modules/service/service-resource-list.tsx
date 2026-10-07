import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { EntityList } from '@/modules/masters/entity-list';
import { ServiceCompletionPrinciples, type ServiceResourceConfig } from './service-resource-config';

export function ServiceResourceList({ resource }: { resource: ServiceResourceConfig }) {
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
        editRouteBase={resource.routeBase}
        createRoute={`${resource.routeBase}/create`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service and technician workflow controls</CardTitle>
          <CardDescription>R14 converts field service into complete frontend workflow surfaces without moving business rules into the frontend.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {ServiceCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
