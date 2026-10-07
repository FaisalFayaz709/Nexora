import { EntityList } from '@/modules/masters/entity-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ProjectCompletionPrinciples, type ProjectResourceConfig } from './project-resource-config';

export function ProjectResourceList({ resource }: { resource: ProjectResourceConfig }) {
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
          <CardTitle className="text-base">Project delivery controls enforced by this screen family</CardTitle>
          <CardDescription>R13 makes projects and assets usable workflow surfaces while preserving backend authority for lifecycle state.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {ProjectCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
