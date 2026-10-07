import { EntityList } from '@/modules/masters/entity-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { AssetCompletionPrinciples, type AssetResourceConfig } from './asset-resource-config';

export function AssetResourceList({ resource }: { resource: AssetResourceConfig }) {
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
        <CardHeader><CardTitle className="text-base">Asset lifecycle controls enforced by this screen family</CardTitle><CardDescription>R13 preserves asset lifecycle continuity from stock registration through installation, QR, warranty, service, replacement and retirement.</CardDescription></CardHeader>
        <CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{AssetCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}</ul></CardContent>
      </Card>
    </section>
  );
}
