import type { TransactionClient } from '@nexora/database';

export interface BusinessEventEntry {
  readonly organizationId: string;
  readonly type: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: unknown;
}

export class BusinessEventWriter {
  async append(tx: TransactionClient, event: BusinessEventEntry): Promise<void> {
    await tx.businessEvent.create({
      data: {
        organizationId: event.organizationId,
        type: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payloadJson: event.payload as never,
      },
    });
  }
}
