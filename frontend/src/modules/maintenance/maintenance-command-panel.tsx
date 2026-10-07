'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { CompleteMaintenanceExecutionSchema, GenerateMaintenanceWorkOrderSchema } from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { MaintenanceCommandConfig, MaintenanceResourceConfig } from './maintenance-resource-config';

function endpointFor(template: string, recordId: string) { return template.replace(':id', recordId); }
function cast(schema: z.ZodTypeAny): z.ZodType<Record<string, unknown>> { return schema as z.ZodType<Record<string, unknown>>; }

function schemaFor(command: MaintenanceCommandConfig) {
  if (command.key === 'complete-maintenance-execution') return cast(CompleteMaintenanceExecutionSchema);
  return cast(GenerateMaintenanceWorkOrderSchema);
}

function defaultsFor(command: MaintenanceCommandConfig): Record<string, unknown> {
  if (command.key === 'complete-maintenance-execution') return { result: 'PASSED', completedAt: '', notes: '', parts: [] };
  return { idempotencyKey: '' };
}

function fieldsFor(command: MaintenanceCommandConfig): ResourceFormField[] {
  if (command.key === 'complete-maintenance-execution') {
    return [
      { name: 'result', label: 'Result', type: 'select', options: [{ label: 'Passed', value: 'PASSED' }, { label: 'Repaired', value: 'REPAIRED' }, { label: 'Failed', value: 'FAILED' }, { label: 'Replaced', value: 'REPLACED' }] },
      { name: 'completedAt', label: 'Completed at', type: 'text' },
      { name: 'notes', label: 'Maintenance notes', type: 'textarea' },
      {
        name: 'parts',
        label: 'Parts used',
        type: 'array',
        minItems: 0,
        description: 'Controlled RHF field array for spare parts consumed during maintenance. Backend posts stock ledger, maintenance part, asset history and warranty/RMA evidence in the same transaction.',
        emptyItem: { productId: '', qty: '1.0000', sourceWarehouseId: '', sourceLocationId: '', batches: [] },
        arrayFields: [
          { name: 'productId', label: 'Product UUID', type: 'text' },
          { name: 'qty', label: 'Quantity', type: 'quantity' },
          { name: 'sourceWarehouseId', label: 'Source warehouse UUID', type: 'text' },
          { name: 'sourceLocationId', label: 'Source location UUID', type: 'text', description: 'Optional warehouse location UUID.' },
          { name: 'batches', label: 'Batch allocations JSON', type: 'json', description: 'Optional array like [{"lotNo":"LOT-001","qty":"1.0000"}].' },
        ],
      },
    ];
  }
  return [{ name: 'idempotencyKey', label: 'Optional idempotency key', type: 'text', description: 'Usually injected by the API client; exposed here only as explicit command evidence.' }];
}

function definitionFor(command: MaintenanceCommandConfig, recordId: string, resource?: MaintenanceResourceConfig): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: `maintenance-${command.key}`,
    title: command.label,
    description: `${command.label} calls locked Fastify endpoint ${endpointFor(command.endpointTemplate, recordId)}. Worker scans can discover schedules, but state-changing generation/completion remains service-owned.`,
    endpoint: endpointFor(command.endpointTemplate, recordId),
    schema: schemaFor(command),
    defaultValues: defaultsFor(command),
    fields: fieldsFor(command),
    invalidateKeys: [createNexoraQueryKey('maintenance', resource?.key ?? 'execution'), createNexoraQueryKey('maintenance-schedule'), createNexoraQueryKey('frontend-grid', resource?.endpoint ?? '/maintenance/schedule')],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function MaintenanceCommandPanel({ commands, recordId, resource, currentStatus = 'UNKNOWN' }: { commands: readonly MaintenanceCommandConfig[]; recordId: string; resource?: MaintenanceResourceConfig; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<MaintenanceCommandConfig | null>(null);
  const commandDefinitions = useMemo(() => commands.map((command) => definitionFor(command, recordId, resource)), [commands, recordId, resource]);

  if (!commands.length) {
    return <Card><CardHeader><CardTitle className="text-base">No direct commands</CardTitle><CardDescription>This maintenance surface is configured as a plan/profile view. Schedule generation and execution completion have their own command routes.</CardDescription></CardHeader></Card>;
  }

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Maintenance commands preserve asset, schedule, work-order, stock, warranty/RMA, tenant, audit rules and next due schedule evidence in the backend.</MakerCheckerNotice>
      <StateTransitionPanel currentStatus={currentStatus} title="Maintenance command panel" description="Generate work order and complete execution use explicit Fastify commands; status is not freely PATCHed." actions={commands.map((command) => ({ id: command.key, label: command.label, permission: command.requiredPermission, onSelect: () => setActiveCommand(command) }))} />
      {commands.map((command, index) => <CommandFormDialog key={command.key} open={activeCommand?.key === command.key} onOpenChange={(open) => { if (!open) setActiveCommand(null); }} definition={commandDefinitions[index]!} />)}
    </div>
  );
}
