'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { EmptyCommandSchema, PostStockCountSchema, StartStockCountSchema, SubmitStockCountSchema } from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { InventoryCommandConfig, InventoryResourceConfig } from './inventory-resource-config';

function commandSchema(commandKey: string): z.ZodType<Record<string, unknown>> {
  if (commandKey === 'start-stock-count') return StartStockCountSchema as z.ZodType<Record<string, unknown>>;
  if (commandKey === 'submit-stock-count') return SubmitStockCountSchema as z.ZodType<Record<string, unknown>>;
  if (commandKey === 'post-stock-count') return PostStockCountSchema as z.ZodType<Record<string, unknown>>;
  return EmptyCommandSchema as z.ZodType<Record<string, unknown>>;
}

function commandDefaults(commandKey: string): Record<string, unknown> {
  if (commandKey === 'start-stock-count') return { productIds: [] };
  if (commandKey === 'submit-stock-count') return { lines: [] };
  if (commandKey === 'post-stock-count') return { comment: '' };
  return {};
}

function commandFields(commandKey: string): ResourceFormField[] {
  if (commandKey === 'start-stock-count') {
    return [{ name: 'productIds', label: 'Product scope', type: 'hidden', description: 'Full implementation uses a product multi-picker. Empty means backend-defined count scope.' }];
  }
  if (commandKey === 'submit-stock-count') {
    return [{ name: 'lines', label: 'Counted quantity lines', type: 'hidden', description: 'Full implementation uses a controlled line grid: lineId + countedQty. This command shape is still validated by shared Zod.' }];
  }
  if (commandKey === 'post-stock-count') {
    return [{ name: 'comment', label: 'Posting comment', type: 'textarea', description: 'Explain the approved variance posting.' }];
  }
  return [{ name: 'note', label: 'Command note', type: 'textarea', description: 'Optional business note. Backend may ignore this for EmptyCommandSchema commands until command payloads expand.' }];
}

function endpointFor(template: string, recordId: string) {
  return template.replace(':id', recordId);
}

export function createInventoryCommandDefinition(
  resource: InventoryResourceConfig,
  command: InventoryCommandConfig,
  recordId: string,
): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: `inventory-${resource.key}-${command.key}`,
    title: command.label,
    description: `${resource.singularTitle} workflow command. It is status-aware, permission-gated and submitted to the locked Fastify endpoint ${endpointFor(command.endpointTemplate, recordId)}.`,
    endpoint: endpointFor(command.endpointTemplate, recordId),
    schema: commandSchema(command.key),
    defaultValues: commandDefaults(command.key),
    fields: commandFields(command.key),
    invalidateKeys: [
      createNexoraQueryKey('inventory', resource.key),
      createNexoraQueryKey('inventory-detail', resource.key, recordId),
      createNexoraQueryKey('frontend-grid', resource.endpoint),
    ],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function InventoryCommandPanel({ resource, recordId, currentStatus = 'UNKNOWN' }: { resource: InventoryResourceConfig; recordId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<InventoryCommandConfig | null>(null);
  const commandDefinitions = useMemo(
    () => resource.commands.map((command) => createInventoryCommandDefinition(resource, command, recordId)),
    [resource, recordId],
  );

  if (!resource.commands.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow commands</CardTitle>
          <CardDescription>This inventory surface has no direct command actions. Stock movement is driven by other records or read-only ledger evidence.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create/edit screens are available only for editable master data. Stock balances and ledger records stay read-only.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Inventory command actions remain backend-authoritative for tenant, branch, status, approval threshold, immutable ledger and audit rules.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title="Inventory command panel"
        description="Only command endpoints can change reservation, transfer, adjustment or stock-count state. Status is never freely PATCHed from an edit form."
        actions={resource.commands.map((command) => ({
          id: command.key,
          label: command.label,
          permission: command.requiredPermission,
          onSelect: () => setActiveCommand(command),
        }))}
      />
      {resource.commands.map((command, index) => (
        <CommandFormDialog
          key={command.key}
          open={activeCommand?.key === command.key}
          onOpenChange={(open) => { if (!open) setActiveCommand(null); }}
          definition={commandDefinitions[index]!}
        />
      ))}
    </div>
  );
}
