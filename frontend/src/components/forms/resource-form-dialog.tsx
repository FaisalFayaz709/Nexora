'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ApiClientError, apiPatch, apiPost, createIdempotencyKey, type ApiSingleEnvelope } from '@/lib/api-client';
import { Dialog } from '../ui';
import { ErrorState } from '../feedback';
import { FormSection } from './form-section';
import { FormShell } from './form-shell';
import { ResourceFormFields } from './resource-form-fields';
import { mapApiValidationErrorsToForm } from './validation-errors';
import type { ResourceFormDefinition, ResourceFormMode } from './resource-form-types';

function mergeDefaultValues<TValues extends Record<string, unknown>>(definition: ResourceFormDefinition<TValues>, initialValues?: Partial<TValues>): TValues {
  return { ...definition.defaultValues, ...(initialValues ?? {}) } as TValues;
}

function pickEditableValues<TValues extends Record<string, unknown>>(definition: ResourceFormDefinition<TValues>, values: TValues, mode: ResourceFormMode): TValues {
  const allowed = definition.fields.filter((field) => {
    if (mode === 'edit' && field.createOnly) return false;
    if (mode === 'create' && field.editOnly) return false;
    return true;
  });
  return allowed.reduce<Record<string, unknown>>((payload, field) => {
    payload[field.name] = values[field.name];
    return payload;
  }, {}) as TValues;
}

export function ResourceFormDialog<TValues extends Record<string, unknown>>({
  open,
  onOpenChange,
  mode,
  definition,
  recordId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ResourceFormMode;
  definition: ResourceFormDefinition<TValues>;
  recordId?: string | undefined;
  initialValues?: Partial<TValues> | undefined;
}) {
  const queryClient = useQueryClient();
  const [recordError, setRecordError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => (definition.idempotent ? createIdempotencyKey(`form_${definition.resourceKey}`) : undefined), [definition.idempotent, definition.resourceKey, open]);
  const form = useForm<TValues>({
    resolver: zodResolver(definition.schema),
    defaultValues: mergeDefaultValues(definition, initialValues) as never,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      setRecordError(null);
      form.reset(mergeDefaultValues(definition, initialValues));
    }
  }, [definition, form, initialValues, open]);

  const mutation = useMutation({
    mutationFn: async (values: TValues) => {
      const payload = pickEditableValues(definition, values, mode);
      if (mode === 'edit') {
        if (!recordId) throw new ApiClientError({ code: 'MISSING_RECORD_ID', message: 'Cannot edit this record without an id.', status: 400 });
        return apiPatch<ApiSingleEnvelope<unknown>>(`${definition.endpoint}/${recordId}`, payload);
      }
      return apiPost<ApiSingleEnvelope<unknown>>(definition.endpoint, payload, { idempotencyKey });
    },
    onSuccess: async () => {
      await Promise.all(definition.invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: queryKey as readonly unknown[] })));
      onOpenChange(false);
    },
    onError: (error) => {
      setRecordError(mapApiValidationErrorsToForm(form, error));
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'edit' ? `Edit ${definition.title}` : `Create ${definition.title}`}
      description={definition.description}
    >
      <FormShell form={form} onSubmit={(values) => mutation.mutate(values)} pending={mutation.isPending} submitLabel={mode === 'edit' ? 'Save changes' : 'Create record'} disabled={mode === 'edit' && !recordId}>
        {recordError ? <ErrorState title="Backend validation" description={recordError} /> : null}
        <FormSection title={definition.title} description="React Hook Form owns field state; the shared Zod contract validates structure; Fastify remains authoritative for tenant, permission, branch, state and transaction rules.">
          <ResourceFormFields<TValues> fields={definition.fields} mode={mode} />
        </FormSection>
      </FormShell>
    </Dialog>
  );
}
