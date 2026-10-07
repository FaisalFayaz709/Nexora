import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { IntegrationWebhookRepository } from './integration-webhook.repository.js';
import { assertPass17DocumentEventCommunicationMatrix, assertWebhookDeliveryPayloadSafe, assertWebhookEndpointConfiguration, hashWebhookTargetUrl } from './integration-webhook-policy.js';

function page(query: { page?: number; pageSize?: number }) {
  const pageNumber = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: pageNumber, pageSize, skip: (pageNumber - 1) * pageSize, take: pageSize };
}

export class IntegrationWebhookService {
  constructor(
    private readonly access: PlatformAccessFacade,
    private readonly repository = new IntegrationWebhookRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'integrations');
    assertPass17DocumentEventCommunicationMatrix();
  }

  async listWebhooks(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const result = await this.repository.listWebhooks({ organizationId: tenant.organizationId, eventType: query.eventType, active: query.active, skip: p.skip, take: p.take });
    return { ...result, page: p.page, pageSize: p.pageSize };
  }

  async getWebhook(tenant: TenantRequestContext, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getWebhook(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'INTEGRATION_WEBHOOK_NOT_FOUND', 'Integration webhook was not found.');
    return row;
  }

  async createWebhook(tenant: TenantRequestContext, actor: { userId: string; ip?: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const connection = await this.repository.getConnection(tenant.organizationId, input.connectionId);
    if (!connection) throw new AppError(404, 'INTEGRATION_CONNECTION_NOT_FOUND', 'Integration connection was not found for this tenant.');
    assertWebhookEndpointConfiguration({ organizationId: tenant.organizationId, connectionOrganizationId: connection.organizationId, targetUrl: input.targetUrl, eventType: input.eventType });
    const targetUrlHash = hashWebhookTargetUrl(input.targetUrl);
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const webhook = await repo.createWebhook({
        organizationId: tenant.organizationId,
        connectionId: input.connectionId,
        eventType: input.eventType,
        targetUrlHash,
        active: true,
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INTEGRATION_WEBHOOK_CREATED',
        subjectType: 'IntegrationWebhook',
        subjectId: webhook.id,
        afterJson: { connectionId: input.connectionId, eventType: input.eventType, targetUrlHash },
        ip: actor.ip ?? null,
      });
      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'integration.webhook.configured',
        aggregateType: 'IntegrationWebhook',
        aggregateId: webhook.id,
        payload: { eventType: input.eventType, targetUrlHash },
      });
      return webhook;
    });
  }

  async updateWebhook(tenant: TenantRequestContext, actor: { userId: string; ip?: string | null }, id: string, input: any) {
    const before = await this.getWebhook(tenant, id);
    const targetUrlHash = input.targetUrl ? hashWebhookTargetUrl(input.targetUrl) : undefined;
    assertWebhookEndpointConfiguration({ organizationId: tenant.organizationId, connectionOrganizationId: before.connection.organizationId, targetUrl: input.targetUrl ?? null, eventType: input.eventType ?? before.eventType });
    return withTransaction(async (tx) => {
      const updated = await this.repository.withDb(tx).updateWebhook(tenant.organizationId, id, {
        ...(input.eventType ? { eventType: input.eventType } : {}),
        ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
        ...(targetUrlHash ? { targetUrlHash } : {}),
      });
      if (!updated) throw new AppError(404, 'INTEGRATION_WEBHOOK_NOT_FOUND', 'Integration webhook was not found for update.');
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INTEGRATION_WEBHOOK_UPDATED',
        subjectType: 'IntegrationWebhook',
        subjectId: id,
        beforeJson: before,
        afterJson: { id, eventType: updated.eventType, active: updated.active, targetUrlHash: updated.targetUrlHash },
        ip: actor.ip ?? null,
      });
      return updated;
    });
  }

  async setActive(tenant: TenantRequestContext, actor: { userId: string; ip?: string | null }, id: string, active: boolean) {
    await this.getWebhook(tenant, id);
    return withTransaction(async (tx) => {
      const updated = await this.repository.withDb(tx).updateWebhook(tenant.organizationId, id, { active });
      if (!updated) throw new AppError(404, 'INTEGRATION_WEBHOOK_NOT_FOUND', 'Integration webhook was not found for state change.');
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: active ? 'INTEGRATION_WEBHOOK_ACTIVATED' : 'INTEGRATION_WEBHOOK_DEACTIVATED',
        subjectType: 'IntegrationWebhook',
        subjectId: id,
        afterJson: { active },
        ip: actor.ip ?? null,
      });
      return updated;
    });
  }

  async listDeliveries(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const result = await this.repository.listDeliveries({ organizationId: tenant.organizationId, webhookId: query.webhookId, eventId: query.eventId, status: query.status, skip: p.skip, take: p.take });
    return { ...result, page: p.page, pageSize: p.pageSize };
  }

  async testDelivery(tenant: TenantRequestContext, actor: { userId: string; ip?: string | null }, id: string, input: any) {
    const webhook = await this.getWebhook(tenant, id);
    if (!webhook.active) throw new AppError(409, 'INTEGRATION_WEBHOOK_INACTIVE', 'Inactive webhooks cannot receive test deliveries.');
    assertWebhookDeliveryPayloadSafe(input.payloadJson);
    return withTransaction(async (tx) => {
      const delivery = await this.repository.withDb(tx).createDelivery({
        organizationId: tenant.organizationId,
        webhookId: id,
        eventId: input.eventId ?? null,
        status: 'PENDING',
        attemptCount: 0,
        payloadJson: { ...input.payloadJson, testDelivery: true },
        idempotencyKey: input.idempotencyKey,
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INTEGRATION_WEBHOOK_TEST_DELIVERY_QUEUED',
        subjectType: 'IntegrationWebhookDelivery',
        subjectId: delivery.id,
        afterJson: { webhookId: id, eventType: webhook.eventType, idempotencyKey: input.idempotencyKey },
        ip: actor.ip ?? null,
      });
      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'webhook.delivery.requested',
        aggregateType: 'IntegrationWebhookDelivery',
        aggregateId: delivery.id,
        payload: { webhookId: id, eventType: webhook.eventType, idempotencyKey: input.idempotencyKey },
      });
      return delivery;
    });
  }
}
