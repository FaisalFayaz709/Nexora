import { prisma, type TransactionClient } from '@nexora/database';
import { QueueProducer } from '../queues/queue-producer.js';

export interface BusinessEventDispatchInput {
  readonly organizationId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payloadJson: Record<string, unknown>;
}

const CRITICAL_MUTATION_KEYS = [
  'stockBalance',
  'stockTransaction',
  'journalEntry',
  'paymentPosting',
  'approvalState',
  'invoiceBalance',
  'postedLedger',
] as const;

export function assertAfterCommitEventPayloadSafe(payloadJson: Record<string, unknown>) {
  for (const key of CRITICAL_MUTATION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payloadJson, key)) {
      throw new Error(`PASS_17_AFTER_COMMIT_EVENT_PAYLOAD_FORBIDDEN: ${key}`);
    }
  }
}

export class BusinessEventDispatcher {
  constructor(
    private readonly queueProducer: QueueProducer,
    private readonly db: typeof prisma | TransactionClient = prisma,
  ) {}

  async dispatchAfterCommit(event: BusinessEventDispatchInput) {
    assertAfterCommitEventPayloadSafe(event.payloadJson);
    const webhooks = await (this.db as any).integrationWebhook.findMany({
      where: { organizationId: event.organizationId, eventType: event.eventType, active: true },
    });
    const jobs: Array<Promise<unknown>> = [];
    for (const webhook of webhooks) {
      const idempotencyKey = `webhook:${event.organizationId}:${event.eventId}:${webhook.id}`;
      const delivery = await (this.db as any).integrationWebhookDelivery.create({
        data: {
          organizationId: event.organizationId,
          webhookId: webhook.id,
          eventId: event.eventId,
          status: 'PENDING',
          attemptCount: 0,
          idempotencyKey,
          payloadJson: {
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            payload: event.payloadJson,
          },
        },
      });
      jobs.push(this.queueProducer.enqueueWebhook({
        organizationId: event.organizationId,
        eventId: event.eventId,
        webhookDeliveryId: delivery.id,
        endpointId: webhook.id,
        eventType: event.eventType,
        payloadJson: delivery.payloadJson,
        idempotencyKey,
      }, idempotencyKey));
    }
    await Promise.all(jobs);
    await (this.db as any).businessEvent.updateMany({
      where: { organizationId: event.organizationId, id: event.eventId, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    return { dispatchedWebhooks: webhooks.length };
  }
}
