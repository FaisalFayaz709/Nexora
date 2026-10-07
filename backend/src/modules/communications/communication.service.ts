import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { assertCommunicationAttachmentTenantScope, assertCommunicationTraceability, assertEmailOutboxDispatch, assertEmailOutboxIdempotency } from '../documents-notifications/index.js';
import { CommunicationRepository } from './communication.repository.js';

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}

export class CommunicationService {
  constructor(
    private readonly access: PlatformAccessFacade,
    private readonly repository = new CommunicationRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'notifications');
  }

  async list(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.list({
      organizationId: tenant.organizationId,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      channel: query.channel,
      status: query.status,
      recipient: query.recipient,
      skip: p.skip,
      take: p.take,
    });
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async send(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const template = input.templateKey
      ? await this.repository.findTemplate(tenant.organizationId, input.templateKey, input.channel)
      : null;
    if (input.templateKey && !template) {
      throw new AppError(404, 'COMMUNICATION_TEMPLATE_NOT_FOUND', 'Active communication template not found for this channel.');
    }

    const now = new Date();
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const status = input.channel === 'MANUAL'
      ? 'SENT'
      : scheduledAt && scheduledAt.getTime() > now.getTime()
        ? 'QUEUED'
        : 'QUEUED';

    const attachmentDocumentIds = input.attachments.map((attachment: any) => attachment.documentId);
    assertCommunicationTraceability({ channel: input.channel, status, recipient: input.recipient, subject: input.subject ?? template?.subject ?? null, body: input.body, attachmentDocumentIds });
    const activeAttachmentDocuments = await this.repository.activeDocumentIds(tenant.organizationId, [...new Set(attachmentDocumentIds)]);
    assertCommunicationAttachmentTenantScope({
      attachmentDocumentIds,
      existingTenantDocumentIds: activeAttachmentDocuments.map((document: any) => document.id),
    });

    return withTransaction(async (tx) => {
      const log = await this.repository.createLog(
        tx,
        {
          organizationId: tenant.organizationId,
          templateId: template?.id ?? null,
          subjectType: input.subjectType,
          subjectId: input.subjectId ?? null,
          channel: input.channel,
          direction: input.direction,
          recipientName: input.recipientName ?? null,
          recipient: input.recipient,
          subject: input.subject ?? template?.subject ?? null,
          body: input.body,
          status,
          scheduledAt,
          sentAt: status === 'SENT' ? now : null,
          createdById: actor.userId,
        },
        input.attachments.map((attachment: any) => ({
          organizationId: tenant.organizationId,
          documentId: attachment.documentId,
          fileName: attachment.fileName ?? null,
        })),
      );

      if (input.channel === 'EMAIL') {
        const emailIdempotencyKey = `email:${tenant.organizationId}:${log.id}`;
        const emailPayloadKeys = ['communicationId', 'subjectType', 'subjectId', 'recipient', 'template'];
        assertEmailOutboxDispatch({ organizationId: tenant.organizationId, recipient: log.recipient, subject: log.subject ?? 'NEXORA notification', template: template?.key ?? 'manual-email', idempotencyKey: emailIdempotencyKey });
        assertEmailOutboxIdempotency({ organizationId: tenant.organizationId, communicationId: log.id, idempotencyKey: emailIdempotencyKey, payloadKeys: emailPayloadKeys });
        await this.repository.createEmailOutbox(tx, {
          organizationId: tenant.organizationId,
          communicationId: log.id,
          template: template?.key ?? 'manual-email',
          recipient: log.recipient,
          subject: log.subject ?? 'NEXORA notification',
          payloadJson: { communicationId: log.id, subjectType: log.subjectType, subjectId: log.subjectId },
          idempotencyKey: emailIdempotencyKey,
          status: 'QUEUED',
          scheduledAt,
        });
        await this.repository.createEmailDelivery(tx, {
          organizationId: tenant.organizationId,
          communicationId: log.id,
          status: 'QUEUED',
          attemptedAt: null,
          deliveredAt: null,
        });
      }
      if (input.channel === 'SMS') {
        await this.repository.createSmsDelivery(tx, {
          organizationId: tenant.organizationId,
          communicationId: log.id,
          status: 'QUEUED',
          attemptedAt: null,
          deliveredAt: null,
        });
      }

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'COMMUNICATION_SEND_REQUESTED',
        subjectType: 'CommunicationLog',
        subjectId: log.id,
        afterJson: {
          channel: log.channel,
          subjectType: log.subjectType,
          subjectId: log.subjectId,
          recipient: log.recipient,
          status: log.status,
          attachmentCount: log.attachments.length,
        },
        ip: actor.ip,
      });
      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'communication.send.requested',
        aggregateType: 'CommunicationLog',
        aggregateId: log.id,
        payload: { channel: log.channel, status: log.status, scheduledAt: log.scheduledAt },
      });
      return log;
    });
  }

  async delivery(tenant: TenantRequestContext, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.delivery(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'COMMUNICATION_NOT_FOUND', 'Communication log not found.');
    return {
      id: row.id,
      channel: row.channel,
      status: row.status,
      failureReason: row.failureReason,
      email: row.emailDeliveryLogs,
      sms: row.smsDeliveryLogs,
      attachments: row.attachments,
    };
  }
}
