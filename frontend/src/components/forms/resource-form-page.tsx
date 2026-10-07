'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ApiClientError, apiGet, apiPatch, apiPost, createIdempotencyKey, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { PermissionGate } from '../app';
import { ErrorState, ForbiddenState, LoadingState } from '../feedback';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui';
import { FormSection } from './form-section';
import { FormShell } from './form-shell';
import { ResourceFormFields } from './resource-form-fields';
import type { ResourceFormDefinition, ResourceFormMode } from './resource-form-types';
import { mapApiValidationErrorsToForm } from './validation-errors';

function mergeDefaultValues(definition: ResourceFormDefinition<Record<string, unknown>>, initialValues?: Partial<Record<string, unknown>>) {
  return { ...definition.defaultValues, ...(initialValues ?? {}) } as Record<string, unknown>;
}

function pickEditableValues(definition: ResourceFormDefinition<Record<string, unknown>>, values: Record<string, unknown>, mode: ResourceFormMode) {
  const allowed = definition.fields.filter((field) => {
    if (mode === 'edit' && field.createOnly) return false;
    if (mode === 'create' && field.editOnly) return false;
    return true;
  });
  return allowed.reduce<Record<string, unknown>>((payload, field) => {
    payload[field.name] = values[field.name];
    return payload;
  }, {});
}

function getIdFromEnvelope(value: ApiSingleEnvelope<unknown>) {
  const data = value.data;
  if (data && typeof data === 'object' && 'id' in data && typeof (data as Record<string, unknown>).id === 'string') {
    return (data as Record<string, unknown>).id as string;
  }
  return null;
}

export function ResourceFormPage({
  mode,
  definition,
  recordId,
  backHref,
  detailHref,
  requiredPermission,
}: {
  mode: ResourceFormMode;
  definition: ResourceFormDefinition<Record<string, unknown>>;
  recordId?: string | undefined;
  backHref: string;
  detailHref?: string | undefined;
  requiredPermission?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [recordError, setRecordError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => (definition.idempotent ? createIdempotencyKey(`form_${definition.resourceKey}`) : undefined), [definition.idempotent, definition.resourceKey]);

  const detailQuery = useQuery({
    queryKey: createNexoraQueryKey(definition.resourceKey, 'detail', recordId ?? 'new'),
    queryFn: () => {
      if (!recordId) throw new ApiClientError({ code: 'MISSING_RECORD_ID', message: 'Missing record id for edit page.', status: 400 });
      return apiGet<ApiSingleEnvelope<Record<string, unknown>>>(`${definition.endpoint}/${recordId}`);
    },
    enabled: mode === 'edit',
  });

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(definition.schema),
    defaultValues: mergeDefaultValues(definition, mode === 'edit' ? detailQuery.data?.data : undefined) as never,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (mode === 'edit' && detailQuery.data?.data) {
      form.reset(mergeDefaultValues(definition, detailQuery.data.data));
    }
  }, [definition, detailQuery.data?.data, form, mode]);

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = pickEditableValues(definition, values, mode);
      if (mode === 'edit') {
        if (!recordId) throw new ApiClientError({ code: 'MISSING_RECORD_ID', message: 'Cannot edit this record without an id.', status: 400 });
        return apiPatch<ApiSingleEnvelope<unknown>>(`${definition.endpoint}/${recordId}`, payload);
      }
      return apiPost<ApiSingleEnvelope<unknown>>(definition.endpoint, payload, { idempotencyKey });
    },
    onSuccess: async (result) => {
      await Promise.all(definition.invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: queryKey as readonly unknown[] })));
      const id = getIdFromEnvelope(result);
      if (mode === 'create' && id && detailHref) router.push(`${detailHref}/${id}`);
      else if (mode === 'edit' && recordId && detailHref) router.push(`${detailHref}/${recordId}`);
      else router.push(backHref);
    },
    onError: (error) => {
      setRecordError(mapApiValidationErrorsToForm(form, error));
    },
  });

  if (mode === 'edit' && detailQuery.isLoading) return <LoadingState title={`Loading ${definition.title}`} description="Fetching the latest tenant-scoped record before editing." />;
  if (mode === 'edit' && detailQuery.error) {
    return <ErrorState title={`Cannot load ${definition.title}`} description={detailQuery.error instanceof Error ? detailQuery.error.message : 'The backend rejected the detail request.'} />;
  }

  const page = (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'edit' ? `Edit ${definition.title}` : `Create ${definition.title}`}</CardTitle>
          <CardDescription>{definition.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormShell
            form={form}
            onSubmit={(values) => mutation.mutate(values)}
            pending={mutation.isPending}
            submitLabel={mode === 'edit' ? 'Save changes' : 'Create record'}
            disabled={mode === 'edit' && !recordId}
            secondaryAction={
              <Button type="button" variant="outline" asChild>
                <a href={backHref}>Back to list</a>
              </Button>
            }
          >
            {recordError ? <ErrorState title="Backend validation" description={recordError} /> : null}
            <FormSection title={definition.title} description="React Hook Form owns field state; shared Zod validates structure; Fastify remains authoritative for tenant, branch, permission, duplicate and status rules.">
              <ResourceFormFields<Record<string, unknown>> fields={definition.fields} mode={mode} />
            </FormSection>
          </FormShell>
        </CardContent>
      </Card>
    </main>
  );

  if (!requiredPermission) return page;

  return (
    <PermissionGate
      permission={requiredPermission}
      fallback={<ForbiddenState title="Permission required" description={`You need ${requiredPermission} before opening this ${definition.title.toLowerCase()} form.`} />}
    >
      {page}
    </PermissionGate>
  );
}
