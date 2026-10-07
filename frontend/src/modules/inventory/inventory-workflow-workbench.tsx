'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { CommandFormDialog, ResourceFormDialog } from '@/components/forms';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';
import { apiGet, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { getResourceFormDefinition } from '@/modules/forms';
import { createInventoryCommandDefinition } from './inventory-command-panel';
import type { InventoryCommandConfig, InventoryResourceConfig } from './inventory-resource-config';

function endpointPreview(template: string) {
  return template.replace(':id', '{recordId}');
}

export function InventoryWorkflowWorkbench({ resource }: { resource: InventoryResourceConfig }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [activeCommand, setActiveCommand] = useState<InventoryCommandConfig | null>(null);
  const formDefinition = getResourceFormDefinition(resource.endpoint, resource.singularTitle);
  const selectedId = recordId.trim();

  const serialQuery = useQuery({
    queryKey: createNexoraQueryKey('inventory-serial-lookup', serialNo.trim()),
    queryFn: () => apiGet<ApiSingleEnvelope<Record<string, unknown>>>(`/inventory/serials/${encodeURIComponent(serialNo.trim())}`),
    enabled: resource.key === 'serial-lookup' && serialNo.trim().length > 0,
  });

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </div>
            <Badge variant="outline">{resource.endpointMode.replace('-', ' ')}</Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {resource.endpoint}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This R11 surface avoids fake GET endpoints when the locked API only defines commands. It provides the RHF/Zod command forms, explicit endpoint mapping and proof that the frontend does not free-edit stock, ledger or status values.
          </p>
          {resource.createPermission ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>Create {resource.singularTitle}</Button>
          ) : null}
        </CardContent>
      </Card>

      {resource.key === 'serial-lookup' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serialized unit lookup</CardTitle>
            <CardDescription>Enter a serial number to call the locked Fastify route /api/v1/inventory/serials/:serialNo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={serialNo} onChange={(event) => setSerialNo(event.target.value)} placeholder="SN98218271" />
            </div>
            {serialQuery.isLoading ? <LoadingState title="Looking up serial" description="Fetching the tenant-scoped serialized unit." /> : null}
            {serialQuery.error ? <ErrorState title="Serial lookup failed" description={serialQuery.error instanceof Error ? serialQuery.error.message : 'The backend rejected the serial lookup.'} /> : null}
            {serialQuery.data ? <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{JSON.stringify(serialQuery.data.data, null, 2)}</pre> : null}
            {!serialNo.trim() ? <EmptyState title="No serial entered" description="Serial lookup is read-only and must not expose status mutation controls." /> : null}
          </CardContent>
        </Card>
      ) : null}

      {resource.commands.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Command execution area</CardTitle>
            <CardDescription>Paste or select the backend record id to open status-aware command dialogs. Full picker widgets can replace this id input without changing the command contract.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={recordId} onChange={(event) => setRecordId(event.target.value)} placeholder={`${resource.singularTitle} id`} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {resource.commands.map((command) => (
                <Card key={command.key}>
                  <CardHeader>
                    <CardTitle className="text-sm">{command.label}</CardTitle>
                    <CardDescription className="font-mono text-xs">{endpointPreview(command.endpointTemplate)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{command.requiredPermission}</Badge>
                      {command.idempotent ? <Badge variant="secondary">Idempotent</Badge> : null}
                    </div>
                    <Button type="button" variant="outline" disabled={!selectedId} onClick={() => setActiveCommand(command)}>
                      Open command
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ResourceFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" definition={formDefinition} />
      {resource.commands.map((command) => (
        <CommandFormDialog
          key={command.key}
          open={activeCommand?.key === command.key && Boolean(selectedId)}
          onOpenChange={(open) => { if (!open) setActiveCommand(null); }}
          definition={createInventoryCommandDefinition(resource, command, selectedId || 'missing-id')}
        />
      ))}
    </section>
  );
}
