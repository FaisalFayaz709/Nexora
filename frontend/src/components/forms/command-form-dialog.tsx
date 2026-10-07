'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { apiPost, createIdempotencyKey, type ApiSingleEnvelope } from '@/lib/api-client';
import { Badge, Dialog } from '../ui';
import { ErrorState } from '../feedback';
import { FormSection } from './form-section';
import { FormShell } from './form-shell';
import { ResourceFormFields } from './resource-form-fields';
import { mapApiValidationErrorsToForm } from './validation-errors';
import type { CommandFormDefinition } from './resource-form-types';

export function CommandFormDialog<TValues extends Record<string, unknown>>({
  open,
  onOpenChange,
  definition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: CommandFormDefinition<TValues>;
}) {
  const queryClient = useQueryClient();
  const [recordError, setRecordError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => createIdempotencyKey(`cmd_${definition.commandKey}`), [definition.commandKey, open]);
  const form = useForm<TValues>({
    resolver: zodResolver(definition.schema),
    defaultValues: definition.defaultValues as never,
    mode: 'onBlur',
  });

  const mutation = useMutation({
    mutationFn: (values: TValues) => apiPost<ApiSingleEnvelope<unknown>>(definition.endpoint, values, { idempotencyKey }),
    onSuccess: async () => {
      await Promise.all(definition.invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: queryKey as readonly unknown[] })));
      onOpenChange(false);
      form.reset(definition.defaultValues);
    },
    onError: (error) => setRecordError(mapApiValidationErrorsToForm(form, error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={definition.title} description={definition.description}>
      <FormShell form={form} onSubmit={(values) => mutation.mutate(values)} pending={mutation.isPending} submitLabel="Confirm command">
        {recordError ? <ErrorState title="Command rejected" description={recordError} /> : null}
        <div className="flex flex-wrap gap-2 text-xs">
          {definition.currentStatus ? <Badge variant="secondary">Current status: {definition.currentStatus}</Badge> : null}
          {definition.requiredPermission ? <Badge variant="outline">Permission: {definition.requiredPermission}</Badge> : null}
          {definition.idempotent ? <Badge variant="outline">Idempotency-Key protected</Badge> : null}
        </div>
        {definition.irreversibleEffects?.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Review irreversible effects before submitting:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {definition.irreversibleEffects.map((effect) => <li key={effect}>{effect}</li>)}
            </ul>
          </div>
        ) : null}
        <FormSection title="Command input" description="Command forms never free-PATCH status. They submit to explicit Fastify workflow command endpoints and let backend services enforce state, tenant, branch, maker-checker and audit rules.">
          <ResourceFormFields<TValues> fields={definition.fields} mode="create" />
        </FormSection>
      </FormShell>
    </Dialog>
  );
}
