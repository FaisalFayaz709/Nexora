import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ActivityTimeline } from '@/components/workflow';
import { MaintenanceCommandPanel } from './maintenance-command-panel';
import { getMaintenanceCommandConfig, getMaintenanceResourceConfig, type MaintenanceCommandKey } from './maintenance-resource-config';

export function MaintenanceScopedCommandPage({ commandKey, recordId }: { commandKey: MaintenanceCommandKey; recordId: string }) {
  const command = getMaintenanceCommandConfig(commandKey);
  const resource = commandKey === 'generate-maintenance-work-order' ? getMaintenanceResourceConfig('schedule') : undefined;
  return (
    <main className="space-y-6">
      <Card><CardHeader><CardTitle>{command.label}</CardTitle><CardDescription>Dedicated R14 command route for maintenance workflow completion.</CardDescription><p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 endpoint: {command.endpointTemplate.replace(':id', recordId)}</p></CardHeader><CardContent><ActivityTimeline items={command.irreversibleEffects.map((effect, index) => ({ id: `${command.key}-${index}`, title: effect, description: 'Backend service owns the transaction, tenant scope and audit behavior.' }))} /></CardContent></Card>
      <MaintenanceCommandPanel commands={[command]} resource={resource} recordId={recordId} currentStatus="COMMAND_READY" />
    </main>
  );
}
