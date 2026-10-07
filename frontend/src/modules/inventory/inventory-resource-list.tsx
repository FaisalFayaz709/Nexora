import { EntityList } from '@/modules/masters/entity-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { InventoryCompletionPrinciples, type InventoryResourceConfig } from './inventory-resource-config';
import { InventoryWorkflowWorkbench } from './inventory-workflow-workbench';

export function InventoryResourceList({ resource }: { resource: InventoryResourceConfig }) {
  const canCreate = Boolean(resource.createPermission && resource.endpointMode === 'crud');
  const readOnly = resource.endpointMode === 'read-only' || resource.endpointMode === 'lookup';

  if (resource.endpointMode === 'command-only') {
    return <InventoryWorkflowWorkbench resource={resource} />;
  }

  if (resource.endpointMode === 'lookup') {
    return <InventoryWorkflowWorkbench resource={resource} />;
  }

  return (
    <section className="space-y-6">
      <EntityList
        title={resource.title}
        endpoint={resource.endpoint}
        description={`${resource.description} ${readOnly ? 'This surface is read-only because values are derived from immutable stock transactions.' : ''}`}
        columns={[...resource.columns]}
        createLabel={`Create ${resource.singularTitle}`}
        createPermission={resource.createPermission}
        detailRouteBase={resource.routeBase}
        editRouteBase={resource.endpointMode === 'crud' ? resource.routeBase : undefined}
        createRoute={canCreate ? `${resource.routeBase}/create` : undefined}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory controls enforced by this screen family</CardTitle>
          <CardDescription>R11 keeps frontend behavior aligned with the locked inventory design instead of introducing hidden balance edits.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {InventoryCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
