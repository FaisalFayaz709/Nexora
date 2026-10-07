import type { TransactionClient } from '@nexora/database';
import type { NumberSequenceService } from './number-sequence.service.js';

export interface BusinessNumberAllocationInput<T extends { id: string }> {
  organizationId: string;
  branchId?: string | null;
  entityType: string;
  fiscalYear: number;
  targetType: string;
  createTarget: (tx: TransactionClient, businessNumber: string) => Promise<T>;
}

export class NumberSequenceFacade {
  constructor(private readonly service: NumberSequenceService) {}

  withBusinessNumber<T extends { id: string }>(input: BusinessNumberAllocationInput<T>) {
    return this.service.withBusinessNumber(input);
  }

  withBusinessNumberInTransaction<T extends { id: string }>(
    tx: TransactionClient,
    input: BusinessNumberAllocationInput<T>,
  ) {
    return this.service.withBusinessNumberInTransaction(tx, input);
  }
}
