import type { TransactionClient } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export type ApprovalFinalDecision = 'APPROVED' | 'REJECTED' | 'RETURNED';

export interface ApprovalSubjectDecision {
  readonly organizationId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly decision: ApprovalFinalDecision;
  readonly actorUserId: string;
  readonly comment: string | null;
  readonly approvalRequestId: string;
}

export interface ApprovalSubjectHandler {
  applyApprovalDecision(
    tx: TransactionClient,
    input: ApprovalSubjectDecision,
  ): Promise<void>;
}

export class ApprovalSubjectRegistry {
  private readonly handlers = new Map<string, ApprovalSubjectHandler>();

  register(subjectType: string, handler: ApprovalSubjectHandler): void {
    if (this.handlers.has(subjectType)) {
      throw new Error(`Approval subject handler already registered: ${subjectType}`);
    }
    this.handlers.set(subjectType, handler);
  }

  async applyDecision(
    tx: TransactionClient,
    input: ApprovalSubjectDecision,
  ): Promise<void> {
    const handler = this.handlers.get(input.subjectType);
    if (!handler) {
      throw new AppError(
        409,
        'APPROVAL_SUBJECT_HANDLER_NOT_REGISTERED',
        'The approval subject does not yet expose a registered transition handler.',
        { subjectType: input.subjectType },
      );
    }
    await handler.applyApprovalDecision(tx, input);
  }
}
