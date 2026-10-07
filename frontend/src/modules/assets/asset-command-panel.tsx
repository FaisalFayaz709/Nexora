'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';

import { CommandFormDialog, type CommandFormDefinition } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import { AssetCommandConfigs, type AssetCommandConfig } from './asset-resource-config';

const uuidDescription = 'Select a tenant-visible UUID from controlled pickers in the complete asset workflow UI.';

const AssetCommandSchemas = {
  'install-asset': z.object({ siteId: z.string().min(1), areaId: z.string().nullable().optional(), projectId: z.string().min(1), technicianId: z.string().min(1), installedAt: z.string().min(1), locationText: z.string().min(1).max(500), checklistId: z.string().nullable().optional() }),
  'replace-asset': z.object({ replacementAssetId: z.string().min(1), reason: z.string().max(2000).optional() }),
  'retire-asset': z.object({ reason: z.string().min(1).max(2000) }),
  'rotate-asset-qr': z.object({ ttlDays: z.coerce.number().int().min(1).max(3650).optional() }),
  'create-asset-rma': z.object({ vendorId: z.string().min(1), reason: z.string().min(1).max(2000) }),
} as const;

function endpointFor(command: AssetCommandConfig, assetId: string) {
  return command.endpointTemplate.replace(':id', assetId);
}

function fieldsFor(command: AssetCommandConfig) {
  switch (command.key) {
    case 'install-asset': return [
      { name: 'siteId', label: 'Site', type: 'text' as const, required: true, description: uuidDescription },
      { name: 'areaId', label: 'Area', type: 'text' as const, description: uuidDescription },
      { name: 'projectId', label: 'Project', type: 'text' as const, required: true, description: uuidDescription },
      { name: 'technicianId', label: 'Technician', type: 'text' as const, required: true, description: uuidDescription },
      { name: 'installedAt', label: 'Installed at', type: 'text' as const, required: true },
      { name: 'locationText', label: 'Location text', type: 'text' as const, required: true },
      { name: 'checklistId', label: 'Checklist', type: 'text' as const, description: uuidDescription },
    ];
    case 'replace-asset': return [{ name: 'replacementAssetId', label: 'Replacement asset', type: 'text' as const, required: true, description: uuidDescription }, { name: 'reason', label: 'Reason', type: 'textarea' as const }];
    case 'retire-asset': return [{ name: 'reason', label: 'Retirement reason', type: 'textarea' as const, required: true }];
    case 'rotate-asset-qr': return [{ name: 'ttlDays', label: 'Token lifetime days', type: 'number' as const }];
    case 'create-asset-rma': return [{ name: 'vendorId', label: 'Vendor', type: 'text' as const, required: true, description: uuidDescription }, { name: 'reason', label: 'RMA reason', type: 'textarea' as const, required: true }];
  }
}

function defaultsFor(command: AssetCommandConfig) {
  switch (command.key) {
    case 'install-asset': return { siteId: '', areaId: null, projectId: '', technicianId: '', installedAt: '', locationText: '', checklistId: null };
    case 'replace-asset': return { replacementAssetId: '', reason: '' };
    case 'retire-asset': return { reason: '' };
    case 'rotate-asset-qr': return { ttlDays: 365 };
    case 'create-asset-rma': return { vendorId: '', reason: '' };
  }
}

function definitionFor(assetId: string, command: AssetCommandConfig): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: command.key,
    title: command.label,
    description: `${command.label} submits to the locked Fastify asset endpoint ${command.endpointTemplate}.`,
    endpoint: endpointFor(command, assetId),
    schema: AssetCommandSchemas[command.key] as z.ZodType<Record<string, unknown>>,
    defaultValues: defaultsFor(command),
    fields: fieldsFor(command),
    invalidateKeys: [createNexoraQueryKey('assets', assetId), createNexoraQueryKey('asset-history', assetId), createNexoraQueryKey('frontend-grid', '/assets')],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function AssetCommandPanel({ assetId, currentStatus = 'UNKNOWN' }: { assetId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<AssetCommandConfig | null>(null);
  const commandDefinitions = useMemo(() => AssetCommandConfigs.map((command) => definitionFor(assetId, command)), [assetId]);
  const commandActions = useMemo(() => AssetCommandConfigs.map((command) => {
    const allowedForStatus = command.allowedStates.includes(currentStatus);
    return {
      id: command.key,
      label: allowedForStatus ? command.label : `${command.label} unavailable`,
      permission: command.requiredPermission,
      disabled: !allowedForStatus,
      onSelect: () => {
        if (allowedForStatus) setActiveCommand(command);
      },
    };
  }), [currentStatus]);

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Asset lifecycle commands remain backend-authoritative for serialized stock, installation, warranty/RMA, QR security, tenant scope and audit.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title="Asset lifecycle commands"
        description="Install, replace, retire, QR rotate and RMA are explicit Fastify commands. Asset lifecycle state is not freely patched from edit forms."
        actions={commandActions}
      />
      <Card>
        <CardHeader><CardTitle className="text-base">Asset command safety</CardTitle><CardDescription>Critical asset actions must preserve serial traceability, customer-site location and service history.</CardDescription></CardHeader>
        <CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground"><li>Install atomically links stock, serial, asset history and audit.</li><li>QR rotate revokes prior token and does not bypass authorization.</li><li>Replace/RMA/retire preserve traceable lifecycle history.</li></ul></CardContent>
      </Card>
      {AssetCommandConfigs.map((command, index) => (
        <CommandFormDialog key={command.key} open={activeCommand?.key === command.key} onOpenChange={(open) => { if (!open) setActiveCommand(null); }} definition={commandDefinitions[index]!} />
      ))}
    </div>
  );
}
