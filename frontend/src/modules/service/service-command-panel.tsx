'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
  AssignTicketSchema,
  AssignWorkOrderSchema,
  CloseTicketSchema,
  CompleteWorkOrderRequestSchema,
  CreateServiceReportSchema,
  ResolveTicketSchema,
  TechnicianCheckInSchema,
  TechnicianCheckOutSchema,
  TechnicianLocationSchema,
  WorkOrderCommandNoteSchema,
} from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { ServiceCommandConfig, ServiceResourceConfig } from './service-resource-config';

function endpointFor(template: string, recordId: string) {
  return template.replace(':id', recordId);
}

function cast(schema: z.ZodTypeAny): z.ZodType<Record<string, unknown>> {
  return schema as z.ZodType<Record<string, unknown>>;
}

const uuidDescription = 'Select an existing record id from a controlled picker in the final module UI; backend validates UUID, tenant and assignment scope.';
const lineItemNotice = 'Controlled React Hook Form field array. Backend validates tenant, branch, tracking type, batch allocation and stock ledger effects.';

const servicePartFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'qty', label: 'Quantity', type: 'quantity', required: true },
  { name: 'sourceWarehouseId', label: 'Source warehouse', type: 'text', required: true, description: uuidDescription },
  { name: 'sourceLocationId', label: 'Source location', type: 'text', description: 'Optional warehouse location id; backend validates location belongs to the warehouse.' },
  { name: 'batches', label: 'Batch allocations', type: 'json', description: 'JSON array like [{"lotNo":"LOT-001","qty":"1"}] for batch-tracked products.' },
];

function schemaFor(command: ServiceCommandConfig) {
  switch (command.key) {
    case 'assign-ticket': return cast(AssignTicketSchema);
    case 'resolve-ticket': return cast(ResolveTicketSchema);
    case 'close-ticket': return cast(CloseTicketSchema);
    case 'assign-work-order': return cast(AssignWorkOrderSchema);
    case 'create-service-report': return cast(CreateServiceReportSchema);
    case 'complete-work-order': return cast(CompleteWorkOrderRequestSchema);
    case 'check-in-work-order': return cast(TechnicianCheckInSchema);
    case 'location-work-order': return cast(TechnicianLocationSchema);
    case 'check-out-work-order': return cast(TechnicianCheckOutSchema);
    default: return cast(WorkOrderCommandNoteSchema);
  }
}

function defaultsFor(command: ServiceCommandConfig): Record<string, unknown> {
  switch (command.key) {
    case 'assign-ticket': return { assigneeId: '' };
    case 'resolve-ticket': return { resolution: '' };
    case 'close-ticket': return { customerConfirmed: true, comment: '' };
    case 'assign-work-order': return { technicianId: '', scheduledAt: null };
    case 'create-service-report': return { arrivalAt: '', departureAt: '', workPerformed: '', rootCause: '', resolution: '', beforePhotoDocumentId: null, afterPhotoDocumentId: null, customerSignDocumentId: null, technicianSignDocumentId: null, parts: [] };
    case 'complete-work-order': return { serviceReportId: '', customerConfirmed: true };
    case 'check-in-work-order': return { latitude: undefined, longitude: undefined, accuracyMeters: undefined, capturedAt: '', photoDocumentId: null };
    case 'location-work-order': return { latitude: undefined, longitude: undefined, accuracyMeters: undefined, capturedAt: '' };
    case 'check-out-work-order': return { latitude: undefined, longitude: undefined, accuracyMeters: undefined, capturedAt: '', photoDocumentId: null, customerSignDocumentId: null };
    default: return { note: '' };
  }
}

function fieldsFor(command: ServiceCommandConfig): ResourceFormField[] {
  switch (command.key) {
    case 'assign-ticket': return [{ name: 'assigneeId', label: 'Assignee employee', type: 'text', required: true, description: uuidDescription }];
    case 'resolve-ticket': return [{ name: 'resolution', label: 'Resolution', type: 'textarea', required: true }];
    case 'close-ticket': return [{ name: 'comment', label: 'Closure comment', type: 'textarea', description: 'Customer confirmation is sent as true; backend remains authoritative.' }];
    case 'assign-work-order': return [{ name: 'technicianId', label: 'Technician', type: 'text', required: true, description: uuidDescription }, { name: 'scheduledAt', label: 'Scheduled at', type: 'text' }];
    case 'create-service-report': return [
      { name: 'arrivalAt', label: 'Arrival time', type: 'text', required: true },
      { name: 'departureAt', label: 'Departure time', type: 'text', required: true },
      { name: 'workPerformed', label: 'Work performed', type: 'textarea', required: true },
      { name: 'rootCause', label: 'Root cause', type: 'textarea', required: true },
      { name: 'resolution', label: 'Resolution', type: 'textarea', required: true },
      { name: 'beforePhotoDocumentId', label: 'Before photo document', type: 'text', description: uuidDescription },
      { name: 'afterPhotoDocumentId', label: 'After photo document', type: 'text', description: uuidDescription },
      { name: 'customerSignDocumentId', label: 'Customer signature document', type: 'text', description: uuidDescription },
      { name: 'parts', label: 'Parts used', type: 'array', description: lineItemNotice, minItems: 0, emptyItem: { productId: '', qty: '1', sourceWarehouseId: '', sourceLocationId: null, batches: [] }, arrayFields: servicePartFields },
    ];
    case 'complete-work-order': return [{ name: 'serviceReportId', label: 'Service report', type: 'text', required: true, description: uuidDescription }];
    case 'check-in-work-order': return [
      { name: 'capturedAt', label: 'Captured at', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'photoDocumentId', label: 'Arrival proof document', type: 'text', description: uuidDescription },
    ];
    case 'location-work-order': return [
      { name: 'capturedAt', label: 'Captured at', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number', required: true },
      { name: 'longitude', label: 'Longitude', type: 'number', required: true },
      { name: 'accuracyMeters', label: 'Accuracy meters', type: 'number' },
    ];
    case 'check-out-work-order': return [
      { name: 'capturedAt', label: 'Captured at', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'accuracyMeters', label: 'Accuracy meters', type: 'number' },
      { name: 'photoDocumentId', label: 'Departure proof document', type: 'text', description: uuidDescription },
      { name: 'customerSignDocumentId', label: 'Customer signature document', type: 'text', description: uuidDescription },
    ];
    default: return [{ name: 'note', label: 'Technician note', type: 'textarea' }];
  }
}

function definitionFor(resource: ServiceResourceConfig, recordId: string, command: ServiceCommandConfig): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: `service-${resource.key}-${command.key}`,
    title: command.label,
    description: `${command.label} is submitted to the locked Fastify endpoint ${endpointFor(command.endpointTemplate, recordId)}. No Next.js business API owns service workflow logic.`,
    endpoint: endpointFor(command.endpointTemplate, recordId),
    schema: schemaFor(command),
    defaultValues: defaultsFor(command),
    fields: fieldsFor(command),
    invalidateKeys: [
      createNexoraQueryKey('service', resource.key),
      createNexoraQueryKey('service-detail', resource.key, recordId),
      createNexoraQueryKey('frontend-grid', resource.endpoint),
      createNexoraQueryKey('technician-pwa', 'offline-queue'),
    ],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function ServiceCommandPanel({ resource, recordId, currentStatus = 'UNKNOWN' }: { resource: ServiceResourceConfig; recordId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<ServiceCommandConfig | null>(null);
  const commandDefinitions = useMemo(() => resource.commands.map((command) => definitionFor(resource, recordId, command)), [resource, recordId]);

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Service commands remain backend-authoritative for SLA, technician assignment, service report, parts consumption, customer confirmation, tenant scope and audit.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title={`${resource.singularTitle} workflow commands`}
        description="Ticket/work-order lifecycle changes use explicit Fastify command endpoints. Status cannot be freely patched from generic edit forms."
        actions={resource.commands.map((command) => ({ id: command.key, label: command.label, permission: command.requiredPermission, destructive: command.destructive, onSelect: () => setActiveCommand(command) }))}
      />
      <Card>
        <CardHeader><CardTitle className="text-base">PASS 13 transaction and offline rules</CardTitle><CardDescription>Technician work can be online or offline, but the backend is always the source of truth.</CardDescription></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Service report completion can reference document ids for photos and signatures.</li>
            <li>Parts used are posted by backend stock transactions, not frontend counters.</li>
            <li>Offline replay is deduped by device/batch/command identity before critical updates.</li>
          </ul>
        </CardContent>
      </Card>
      {resource.commands.map((command, index) => (
        <CommandFormDialog key={command.key} open={activeCommand?.key === command.key} onOpenChange={(open) => { if (!open) setActiveCommand(null); }} definition={commandDefinitions[index]!} />
      ))}
    </div>
  );
}
