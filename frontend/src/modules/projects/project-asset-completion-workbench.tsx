import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { ActivityTimeline } from '@/components/workflow';
import { ProjectCompletionPrinciples } from './project-resource-config';

export function ProjectAssetCompletionWorkbench() {
  const surfaces = [
    { title: 'Projects', description: 'List/create/detail/edit project aggregates with workflow tabs for BOM, budget, costing, material request, handover and timeline.', href: '/projects' },
    { title: 'Project tasks', description: 'List/create/detail/edit task records with assignee, priority, status and dependency fields.', href: '/project-tasks' },
    { title: 'Assets', description: 'List/create/detail/edit assets and manage install, replace, retire, QR, RMA and history command/read-model surfaces.', href: '/assets' },
    { title: 'Asset register from stock', description: 'Dedicated asset creation path from eligible serial/stock using Fastify /assets/register-from-stock.', href: '/assets/register-from-stock' },
  ];
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>R13 Projects and Assets frontend completion</CardTitle>
          <CardDescription>Source-level completion for project delivery, asset registration, installation, QR lifecycle, warranty/RMA traceability and handover continuity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActivityTimeline items={surfaces.map((item) => ({ id: item.title, title: item.title, description: item.description }))} />
          <div className="flex flex-wrap gap-2">
            {surfaces.map((item) => <Button key={item.href} variant="outline" asChild><a href={item.href}>{item.title}</a></Button>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Locked principles</CardTitle><CardDescription>These rules keep the pass inside the approved modular-monolith architecture.</CardDescription></CardHeader>
        <CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{ProjectCompletionPrinciples.map((principle) => <li key={principle}>{principle}</li>)}</ul></CardContent>
      </Card>
    </section>
  );
}
