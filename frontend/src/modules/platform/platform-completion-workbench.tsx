import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { PlatformRequiredCompletionSurfaces, PlatformCompletionPrinciples } from './platform-resource-config';

const sections = [
  ['Documents', 'Upload intent, complete upload, versions, authorized download URLs and MinIO StorageService boundary.'],
  ['Reports', 'Reports, export jobs, report executions, custom report builder, saved reports and scheduled reports.'],
  ['Communications', 'Communication templates, send command, delivery status, email/SMS/portal logs and attachments.'],
  ['Notifications', 'Current-user notification center plus read/read-all command behavior.'],
  ['Read models', 'Audit logs, global search and unified calendar with permission-filtered, tenant-scoped results.'],
  ['Portals', 'Customer/vendor portal pages constrained to linked records, without internal ERP navigation.'],
  ['SaaS and features', 'Plans, subscriptions, tenant usage, feature flags and module configuration.'],
];

export function PlatformCompletionWorkbench() {
  return (
    <main className="space-y-6">
      <Card><CardHeader><CardTitle>Pass R16 — Platform, Portals and Reports Completion</CardTitle><CardDescription>Source-level completion for platform support modules while preserving Fastify /api/v1, tenant isolation, RBAC, audit, MinIO boundary, BullMQ export/notification work and route-group shells.</CardDescription></CardHeader></Card>
      <section className="grid gap-4 lg:grid-cols-2">{sections.map(([title, description]) => <Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">All UI uses centralized API/query layers, React Hook Form command/forms where mutation exists, and TanStack Table/DataTable for list/read-model grids.</p></CardContent></Card>)}</section>
      <Card><CardHeader><CardTitle className="text-base">Required surfaces closed by this pass</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">{PlatformRequiredCompletionSurfaces.map((item) => <li key={item} className="rounded-md border p-3">{item}</li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Locked architecture controls</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">{PlatformCompletionPrinciples.map((item) => <li key={item} className="rounded-md border p-3">{item}</li>)}</ul></CardContent></Card>
    </main>
  );
}
