'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import { ProjectCommandConfigs, type ProjectCommandConfig } from './project-resource-config';

const uuidDescription = 'Select a tenant-visible UUID from the controlled picker in the complete project workflow UI.';
const lineItemNotice = 'Project BOM and budget line arrays are controlled by module-owned field arrays and validated by shared Zod contracts before Fastify receives the command.';

const bomItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'requiredQty', label: 'Required quantity', type: 'quantity', required: true },
];

const budgetLineFields: ResourceFormField[] = [
  { name: 'category', label: 'Budget category', type: 'text', required: true },
  { name: 'budgetAmount', label: 'Budget amount', type: 'money', required: true },
];

const ProjectCommandSchemas = {
  'save-draft-bom': z.object({ items: z.array(z.object({ productId: z.string().min(1), requiredQty: z.string().min(1) })).default([]) }),
  'approve-bom': z.object({ bomId: z.string().min(1), comment: z.string().max(2000).optional() }),
  'save-draft-budget': z.object({ lines: z.array(z.object({ category: z.string().min(1), budgetAmount: z.string().min(1) })).min(1) }),
  'approve-budget': z.object({ budgetId: z.string().min(1), comment: z.string().max(2000).optional() }),
  'create-material-request': z.object({ requestedById: z.string().min(1).optional(), comment: z.string().max(2000).optional() }),
  'complete-handover': z.object({ acceptedByCustomerId: z.string().min(1), acceptedAt: z.string().optional(), documentId: z.string().nullable().optional() }),
} as const;

function endpointFor(command: ProjectCommandConfig, projectId: string) {
  return command.endpointTemplate
    .replace(':id', projectId)
    .replace(':bomId', 'selected-bom-id')
    .replace(':budgetId', 'selected-budget-id');
}

function fieldsFor(command: ProjectCommandConfig) {
  switch (command.key) {
    case 'save-draft-bom': return [{ name: 'items', label: 'BOM items', type: 'array' as const, description: lineItemNotice, arrayFields: bomItemFields, emptyItem: { productId: '', requiredQty: '1' }, minItems: 1 }];
    case 'approve-bom': return [{ name: 'bomId', label: 'BOM version', type: 'text' as const, required: true, description: uuidDescription }, { name: 'comment', label: 'Approval comment', type: 'textarea' as const }];
    case 'save-draft-budget': return [{ name: 'lines', label: 'Budget lines', type: 'array' as const, description: lineItemNotice, arrayFields: budgetLineFields, emptyItem: { category: '', budgetAmount: '0.00' }, minItems: 1 }];
    case 'approve-budget': return [{ name: 'budgetId', label: 'Budget version', type: 'text' as const, required: true, description: uuidDescription }, { name: 'comment', label: 'Approval comment', type: 'textarea' as const }];
    case 'create-material-request': return [{ name: 'requestedById', label: 'Requested by employee', type: 'text' as const, description: uuidDescription }, { name: 'comment', label: 'Material request note', type: 'textarea' as const }];
    case 'complete-handover': return [{ name: 'acceptedByCustomerId', label: 'Customer approver', type: 'text' as const, required: true, description: uuidDescription }, { name: 'acceptedAt', label: 'Accepted at', type: 'text' as const }, { name: 'documentId', label: 'Handover document', type: 'text' as const, description: uuidDescription }];
  }
}

function defaultsFor(command: ProjectCommandConfig) {
  switch (command.key) {
    case 'save-draft-bom': return { items: [] };
    case 'approve-bom': return { bomId: '', comment: '' };
    case 'save-draft-budget': return { lines: [] };
    case 'approve-budget': return { budgetId: '', comment: '' };
    case 'create-material-request': return { requestedById: '', comment: '' };
    case 'complete-handover': return { acceptedByCustomerId: '', acceptedAt: '', documentId: null };
  }
}

function definitionFor(projectId: string, command: ProjectCommandConfig): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: command.key,
    title: command.label,
    description: `${command.label} submits to the locked Fastify project endpoint ${command.endpointTemplate}. For approve-bom and approve-budget, the typed child id fields identify the selected version; runtime wiring replaces the selected-child placeholders before E2E certification.`,
    endpoint: endpointFor(command, projectId),
    schema: ProjectCommandSchemas[command.key] as z.ZodType<Record<string, unknown>>,
    defaultValues: defaultsFor(command),
    fields: fieldsFor(command),
    invalidateKeys: [
      createNexoraQueryKey('projects', projectId),
      createNexoraQueryKey('project-scoped', projectId),
      createNexoraQueryKey('frontend-grid', '/projects'),
    ],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function ProjectCommandPanel({ projectId, currentStatus = 'UNKNOWN' }: { projectId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<ProjectCommandConfig | null>(null);
  const commandDefinitions = useMemo(() => ProjectCommandConfigs.map((command) => definitionFor(projectId, command)), [projectId]);

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Project lifecycle commands remain backend-authoritative for tenant scope, project state, BOM versioning, material/procurement continuity, handover evidence and audit.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title="Project workflow commands"
        description="Use explicit Fastify commands for BOM approval, material requirement and handover. The frontend never free-PATCHes project lifecycle status."
        actions={ProjectCommandConfigs.map((command) => ({ id: command.key, label: command.label, permission: command.requiredPermission, onSelect: () => setActiveCommand(command) }))}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project command safety</CardTitle>
          <CardDescription>Runtime pass must replace project command placeholders for nested resources such as BOM approval with selected child record ids before browser E2E certification.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>BOM save uses PUT /api/v1/projects/:id/bom and validates line arrays.</li>
            <li>Budget save uses PUT /api/v1/projects/:id/budget and approval uses POST /api/v1/projects/:id/budget/:budgetId/approve.</li>
            <li>Material request uses POST /api/v1/projects/:id/material-request after approved BOM shortage calculation.</li>
            <li>Handover uses POST /api/v1/projects/:id/handover and records customer acceptance evidence.</li>
          </ul>
        </CardContent>
      </Card>
      {ProjectCommandConfigs.map((command, index) => (
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
