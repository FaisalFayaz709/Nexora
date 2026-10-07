import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ActivityTimeline } from '@/components/workflow';
import { ServiceCommandPanel } from './service-command-panel';
import { getServiceResourceConfig, type ServiceScopedSurfaceConfig } from './service-resource-config';

export function ServiceScopedSurface({ workOrderId, ticketId, surface }: { workOrderId?: string; ticketId?: string; surface: ServiceScopedSurfaceConfig }) {
  const resource = surface.key === 'sla' ? getServiceResourceConfig('tickets') : getServiceResourceConfig('work-orders');
  const recordId = surface.key === 'sla' ? ticketId ?? workOrderId ?? '' : workOrderId ?? ticketId ?? '';
  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{surface.title}</CardTitle>
          <CardDescription>{surface.description}</CardDescription>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 endpoint: {surface.endpointTemplate.replace(':id', recordId || '[id]')}</p>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={surface.auditFocus.map((item, index) => ({ id: `${surface.key}-${index}`, title: item, description: 'R14 keeps this evidence inside tenant-scoped service workflow screens.' }))} />
        </CardContent>
      </Card>
      {recordId && surface.command ? <ServiceCommandPanel resource={resource} recordId={recordId} currentStatus="COMMAND_READY" /> : null}
    </main>
  );
}
