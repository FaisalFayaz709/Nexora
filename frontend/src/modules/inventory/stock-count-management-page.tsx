import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { EntityList } from '@/modules/masters/entity-list';
import { getInventoryResourceConfig, InventoryCompletionPrinciples } from './inventory-resource-config';

export function StockCountManagementPage() {
  const resource = getInventoryResourceConfig('stock-counts');
  return (
    <section className="space-y-6">
      <EntityList
        title={resource.title}
        endpoint={resource.endpoint}
        description="Physical stock count and cycle count control surface. Counts are listed from Fastify, created with RHF/Zod, started to freeze the selected scope, submitted with counted quantities and posted only through the controlled command endpoint."
        columns={[...resource.columns]}
        createLabel="Create Stock Count"
        createPermission={resource.createPermission}
        detailRouteBase={resource.routeBase}
        createRoute={`${resource.routeBase}/create`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock count controls</CardTitle>
          <CardDescription>PASS 08 keeps physical count/cycle count aligned with the locked inventory ledger model.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Starting a count snapshots system quantities and freezes the warehouse or location scope.</li>
            <li>Submitting a count records every line, calculates variance and preserves row-level evidence.</li>
            <li>Posting a count uses maker-checker approval, stock adjustment records, immutable ledger lines and audit events.</li>
            {InventoryCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
