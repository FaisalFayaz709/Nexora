'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CreatePurchaseRequestRequestSchema, type CreatePurchaseRequestRequest } from '@nexora/shared';
import { FormSection, FormShell, QuantityInput, TextField } from '.';
import { apiRequest } from '@/lib/api-client';

export function CreatePurchaseRequestFormExample() {
  const queryClient = useQueryClient();
  const form = useForm<CreatePurchaseRequestRequest>({
    resolver: zodResolver(CreatePurchaseRequestRequestSchema),
    defaultValues: { projectId: '', requiredDate: '', reason: '', items: [] },
  });
  const mutation = useMutation({
    mutationFn: (values: CreatePurchaseRequestRequest) => apiRequest('/purchase-requests', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
  });
  return (
    <FormShell form={form} onSubmit={(values) => mutation.mutate(values)} pending={mutation.isPending} submitLabel="Create purchase request">
      <FormSection title="Purchase request" description="Example only: module-owned forms must import shared Zod contracts and submit with TanStack Query mutations.">
        <TextField<CreatePurchaseRequestRequest> name="projectId" label="Project" />
        <TextField<CreatePurchaseRequestRequest> name="requiredDate" label="Required date" type="date" />
        <TextField<CreatePurchaseRequestRequest> name="reason" label="Reason" />
        <QuantityInput<CreatePurchaseRequestRequest> name="items" label="Items" />
      </FormSection>
    </FormShell>
  );
}
