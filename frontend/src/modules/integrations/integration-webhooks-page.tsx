'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CreateIntegrationWebhookSchema, type CreateIntegrationWebhookInput } from '@nexora/shared';

import { DataTable } from '@/components/data';
import { ErrorState } from '@/components/feedback';
import { FormSection, FormShell, TextField, mapApiValidationErrorsToForm } from '@/components/forms';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { createIdempotencyKey } from '@/lib/api-client';
import {
  createIntegrationWebhook,
  integrationWebhookKeys,
  listIntegrationWebhookDeliveries,
  listIntegrationWebhooks,
  setIntegrationWebhookActive,
  testIntegrationWebhookDelivery,
} from './api';

import { createIntegrationWebhookColumns, integrationWebhookDeliveryColumns, type IntegrationWebhookDeliveryRow, type IntegrationWebhookRow } from './columns';

type ListResponse<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; requestId: string } };

function asRows<T>(value: unknown): T[] {
  return Array.isArray((value as ListResponse<T> | undefined)?.data) ? (value as ListResponse<T>).data : [];
}

function pageCount<T>(value: unknown) {
  const meta = (value as ListResponse<T> | undefined)?.meta;
  if (!meta?.pageSize) return 1;
  return Math.max(1, Math.ceil((meta.total ?? 0) / meta.pageSize));
}

export function IntegrationWebhooksPage() {
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const queryClient = useQueryClient();
  const form = useForm<CreateIntegrationWebhookInput>({
    resolver: zodResolver(CreateIntegrationWebhookSchema),
    defaultValues: {
      connectionId: '',
      eventType: 'invoice.posted',
      targetUrl: 'https://example.com/webhooks/nexora',
    },
    mode: 'onBlur',
  });
  const [recordError, setRecordError] = useState<string | null>(null);

  const webhooks = useQuery({
    queryKey: integrationWebhookKeys.list({ page: 1, pageSize: 25 }),
    queryFn: () => listIntegrationWebhooks({ page: 1, pageSize: 25 }) as Promise<ListResponse<IntegrationWebhookRow>>,
  });

  const deliveries = useQuery({
    queryKey: integrationWebhookKeys.deliveries({ page: 1, pageSize: 20, webhookId: selectedWebhookId || undefined }),
    queryFn: () => listIntegrationWebhookDeliveries({ page: 1, pageSize: 20, webhookId: selectedWebhookId || undefined }) as Promise<ListResponse<IntegrationWebhookDeliveryRow>>,
  });

  const rows = asRows<IntegrationWebhookRow>(webhooks.data);
  const selected = useMemo(() => rows.find((row) => row.id === selectedWebhookId) ?? null, [rows, selectedWebhookId]);

  const createMutation = useMutation({
    mutationFn: (values: CreateIntegrationWebhookInput) => createIntegrationWebhook(values),
    onSuccess: async () => {
      form.reset({ connectionId: '', eventType: 'invoice.posted', targetUrl: 'https://example.com/webhooks/nexora' });
      setRecordError(null);
      await queryClient.invalidateQueries({ queryKey: integrationWebhookKeys.lists() });
    },
    onError: (error) => setRecordError(mapApiValidationErrorsToForm(form, error)),
  });

  const activeMutation = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setIntegrationWebhookActive(input.id, input.active),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: integrationWebhookKeys.lists() }),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      testIntegrationWebhookDelivery(
        selectedWebhookId,
        { eventType: selected?.eventType, source: 'PASS_18_FRONTEND_COMPLETION_SOURCE_TEST' },
        createIdempotencyKey('integration_webhook_test_delivery'),
      ),
    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: integrationWebhookKeys.deliveries({ page: 1, pageSize: 20, webhookId: selectedWebhookId || undefined }),
      }),
  });

  const webhookColumns = useMemo(
    () =>
      createIntegrationWebhookColumns({
        onSelect: setSelectedWebhookId,
        onToggleActive: (row) => activeMutation.mutate({ id: row.id, active: !row.active }),
        actionPending: activeMutation.isPending,
      }),
    [activeMutation],
  );

  const deliveryColumns = useMemo(() => integrationWebhookDeliveryColumns, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pass 18</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Frontend Completion: Integration Webhooks</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Tenant-scoped webhook configuration and delivery evidence now use the shared Zod contract, React Hook Form, centralized API helpers,
          TanStack Query invalidation and TanStack Table grids. The screen stays inside the ERP route-group shell and calls only the locked Fastify /api/v1 endpoints.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create webhook</CardTitle>
            <CardDescription>React Hook Form + shared Zod schema; backend remains authoritative for tenant, permission and target policy.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormShell
              form={form}
              onSubmit={(values) => createMutation.mutate(values)}
              pending={createMutation.isPending}
              submitLabel="Create tenant-scoped webhook"
              disabled={createMutation.isPending}
            >
              {recordError ? <ErrorState title="Backend validation" description={recordError} /> : null}
              <FormSection title="Webhook target" description="Connection id and target URL are validated before Fastify stores only safe tenant-scoped webhook configuration.">
                <TextField<CreateIntegrationWebhookInput> name="connectionId" label="Connection ID" description="UUID of the approved integration connection for this tenant." />
                <TextField<CreateIntegrationWebhookInput> name="eventType" label="Event type" description="Example: invoice.posted, payment.posted or purchase_order.approved." />
                <TextField<CreateIntegrationWebhookInput> name="targetUrl" label="HTTPS target URL" description="Only an approved HTTPS endpoint should be registered." />
              </FormSection>
            </FormShell>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Webhook registry</CardTitle>
            <CardDescription>Permission-filtered registry rendered through the shared DataTable abstraction, not an ad-hoc table.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={webhookColumns}
              data={rows}
              loading={webhooks.isLoading}
              error={webhooks.error instanceof Error ? webhooks.error.message : undefined}
              emptyTitle="No webhooks found"
              emptyDescription="Create a tenant-scoped webhook after selecting an approved integration connection."
              pagination={{ pageIndex: 0, pageSize: 25, pageCount: pageCount<IntegrationWebhookRow>(webhooks.data), total: webhooks.data?.meta?.total }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Delivery evidence</CardTitle>
              <CardDescription>Delivery rows are event-bound and tenant-scoped; workers retry delivery after commit only.</CardDescription>
            </div>
            <Button type="button" disabled={!selectedWebhookId || testMutation.isPending} onClick={() => testMutation.mutate()}>
              Queue test delivery
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={deliveryColumns}
            data={asRows<IntegrationWebhookDeliveryRow>(deliveries.data)}
            loading={deliveries.isLoading}
            error={deliveries.error instanceof Error ? deliveries.error.message : testMutation.error instanceof Error ? testMutation.error.message : undefined}
            emptyTitle="No delivery evidence yet"
            emptyDescription="Select a webhook and queue a test delivery to verify after-commit delivery evidence."
            pagination={{ pageIndex: 0, pageSize: 20, pageCount: pageCount<IntegrationWebhookDeliveryRow>(deliveries.data), total: deliveries.data?.meta?.total }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
