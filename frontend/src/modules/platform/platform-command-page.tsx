'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { CommandFormDialog, type CommandFormDefinition } from '@/components/forms';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getPlatformResourceConfig, type PlatformCommandConfig, type PlatformCommandKey, type PlatformResourceKey } from './platform-resource-config';

function endpointFor(command: PlatformCommandConfig, recordId?: string) {
  return command.endpointTemplate.replace(':id', recordId ?? 'missing-record-id');
}

function schemaFor(command: PlatformCommandKey) {
  if (command === 'document-upload-intent') return z.object({ fileName: z.string().min(1), mimeType: z.string().min(3), size: z.coerce.number().positive(), subjectType: z.string().min(2), subjectId: z.string().min(1), category: z.string().min(2) });
  if (command === 'document-complete-upload' || command === 'document-version') return z.object({ documentId: z.string().optional(), objectKey: z.string().min(3), checksum: z.string().min(8), versionNote: z.string().optional() });
  if (command === 'report-export') return z.object({ reportId: z.string().min(1), format: z.enum(['CSV', 'XLSX', 'PDF']), filterJson: z.record(z.unknown()).optional() });
  if (command === 'send-communication') return z.object({ subjectType: z.string().min(2), subjectId: z.string().min(1), channel: z.enum(['EMAIL', 'SMS', 'PORTAL']), recipient: z.string().min(3), subject: z.string().min(2), body: z.string().min(2) });
  if (command === 'create-report-template') return z.object({ name: z.string().min(2), dataSource: z.string().min(2), selectedFields: z.array(z.string()).default([]), requiredPermission: z.string().min(2) });
  if (command === 'create-saved-report') return z.object({ name: z.string().min(2), templateId: z.string().min(1), selectedFields: z.array(z.string()).default([]), filterJson: z.record(z.unknown()).optional() });
  if (command === 'create-scheduled-report') return z.object({ name: z.string().min(2), savedReportId: z.string().min(1), frequency: z.string().min(2), recipients: z.array(z.string()).default([]) });
  if (command === 'create-saas-plan' || command === 'create-saas-subscription') return z.object({ name: z.string().min(2), organizationId: z.string().optional(), planId: z.string().optional(), status: z.string().default('DRAFT') });
  if (command === 'toggle-feature') return z.object({ module: z.string().min(2), enabled: z.boolean(), reason: z.string().min(2) });
  return z.object({ comment: z.string().optional() });
}

function defaultsFor(command: PlatformCommandKey): Record<string, unknown> {
  if (command === 'document-upload-intent') return { fileName: 'site-photo.jpg', mimeType: 'image/jpeg', size: 842113, subjectType: 'PROJECT', subjectId: '', category: 'SITE_PHOTO' };
  if (command === 'document-complete-upload' || command === 'document-version') return { objectKey: 'organizations/{organizationId}/documents/document-id.bin', checksum: 'checksum-from-upload', versionNote: '' };
  if (command === 'report-export') return { reportId: '', format: 'PDF', filterJson: {} };
  if (command === 'send-communication') return { subjectType: 'PROJECT', subjectId: '', channel: 'EMAIL', recipient: '', subject: 'NEXORA update', body: '' };
  if (command === 'toggle-feature') return { module: 'procurement', enabled: true, reason: 'Controlled rollout' };
  return {};
}

export function PlatformCommandPage({ resourceKey, commandKey, recordId }: { resourceKey: PlatformResourceKey; commandKey: PlatformCommandKey; recordId?: string }) {
  const router = useRouter();
  const resource = getPlatformResourceConfig(resourceKey);
  const command = resource.commands.find((item) => item.key === commandKey) ?? resource.commands[0];

  const definition = useMemo<CommandFormDefinition<Record<string, unknown>>>(() => ({
    commandKey: command?.key ?? commandKey,
    title: command?.label ?? commandKey,
    description: `Platform command for ${resource.title}. React Hook Form owns field state, Zod validates browser-safe shape and Fastify /api/v1 remains authoritative for tenant, permission, audit and workflow rules.`,
    endpoint: command ? endpointFor(command, recordId) : resource.endpoint,
    schema: schemaFor(command?.key ?? commandKey),
    defaultValues: defaultsFor(command?.key ?? commandKey),
    fields: [],
    invalidateKeys: [['platform', resource.key], ['platform-command', commandKey]],
    idempotent: command?.idempotent ?? true,
    requiredPermission: command?.requiredPermission,
    irreversibleEffects: [...(command?.irreversibleEffects ?? [])],
  }), [command, commandKey, recordId, resource]);

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{definition.title}</CardTitle>
          <CardDescription>{definition.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CommandFormDialog open onOpenChange={() => router.push(resource.routeBase)} definition={definition} />
          <Button variant="outline" asChild><a href={resource.routeBase}>Back to {resource.title}</a></Button>
        </CardContent>
      </Card>
    </main>
  );
}
