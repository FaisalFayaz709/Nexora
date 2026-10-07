import { apiGet, apiPatch, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type IntegrationWebhookFilters = ApiQueryParams & { page?: number; pageSize?: number; eventType?: string; active?: boolean };
export type IntegrationWebhookDeliveryFilters = ApiQueryParams & { page?: number; pageSize?: number; webhookId?: string; eventId?: string; status?: string };
export type CreateIntegrationWebhookValues = { connectionId: string; eventType: string; targetUrl: string };
export type UpdateIntegrationWebhookValues = Partial<CreateIntegrationWebhookValues> & { active?: boolean };

export const integrationEndpoints = {
  webhooks: '/integration-webhooks',
  webhookDetail: (id: string) => `/integration-webhooks/${id}`,
  webhookActivate: (id: string) => `/integration-webhooks/${id}/activate`,
  webhookDeactivate: (id: string) => `/integration-webhooks/${id}/deactivate`,
  webhookTestDelivery: (id: string) => `/integration-webhooks/${id}/test-delivery`,
  deliveries: '/integration-webhook-deliveries',
} as const;

export const integrationKeys = createModuleQueryKeys('integrations', {
  webhooks: 'webhooks',
  webhookDetail: 'webhook-detail',
  deliveries: 'webhook-deliveries',
});

export const integrationWebhookKeys = {
  lists: () => integrationKeys.list('webhooks'),
  list: (filters: IntegrationWebhookFilters) => integrationKeys.list('webhooks', filters),
  detail: (id: string) => integrationKeys.detail('webhook-detail', id),
  deliveries: (filters: IntegrationWebhookDeliveryFilters) => integrationKeys.list('webhook-deliveries', filters),
} as const;

export const integrationWebhooksApi = createCrudResourceApi<unknown, unknown, CreateIntegrationWebhookValues, UpdateIntegrationWebhookValues>(integrationEndpoints.webhooks);
export const integrationWebhookDeliveriesApi = createCrudResourceApi(integrationEndpoints.deliveries);

export function listIntegrationWebhooks(filters: IntegrationWebhookFilters = {}) {
  return apiGet(integrationEndpoints.webhooks, filters);
}

export function getIntegrationWebhook(id: string) {
  return apiGet(integrationEndpoints.webhookDetail(id));
}

export function createIntegrationWebhook(values: CreateIntegrationWebhookValues) {
  return postCommand(integrationEndpoints.webhooks, values, `integration-webhook-create-${values.connectionId}-${values.eventType}`);
}

export function updateIntegrationWebhook(id: string, values: UpdateIntegrationWebhookValues) {
  return apiPatch(integrationEndpoints.webhookDetail(id), values);
}

export function setIntegrationWebhookActive(id: string, active: boolean) {
  return postCommand(active ? integrationEndpoints.webhookActivate(id) : integrationEndpoints.webhookDeactivate(id), {});
}

export function listIntegrationWebhookDeliveries(filters: IntegrationWebhookDeliveryFilters = {}) {
  return apiGet(integrationEndpoints.deliveries, filters);
}

export function testIntegrationWebhookDelivery(id: string, payloadJson: Record<string, unknown>, idempotencyKey: string) {
  return postCommand(integrationEndpoints.webhookTestDelivery(id), { payloadJson, idempotencyKey }, idempotencyKey);
}

export const IntegrationsApiRegistry = { endpoints: integrationEndpoints, keys: integrationKeys } as const;
