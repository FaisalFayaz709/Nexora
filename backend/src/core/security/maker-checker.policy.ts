import { AppError } from '../http/errors.js';

export class MakerCheckerPolicy {
  assertDifferentActor(actorUserId: string, creatorUserId: string): void {
    if (actorUserId === creatorUserId) {
      throw new AppError(
        403,
        'MAKER_CHECKER_VIOLATION',
        'The creator cannot be the sole approver for this high-risk transaction.',
      );
    }
  }
}

export const HighRiskMakerCheckerSubjects = [
  'APPROVAL_DECISION',
  'STOCK_ADJUSTMENT',
  'STOCK_COUNT_VARIANCE',
  'PURCHASE_ORDER_APPROVAL',
  'SUPPLIER_INVOICE_APPROVAL',
  'PAYMENT_POSTING',
  'JOURNAL_POSTING',
  'CUSTOMER_INVOICE_POSTING',
  'ASSET_REPLACEMENT',
  'ROLE_PERMISSION_ADMINISTRATION',
  'DOCUMENT_EXTERNAL_ACCESS',
] as const;
export type HighRiskMakerCheckerSubject = (typeof HighRiskMakerCheckerSubjects)[number];

const HighRiskMakerCheckerSubjectSet = new Set<string>(HighRiskMakerCheckerSubjects);

export function assertHighRiskMakerCheckerDecision(input: {
  readonly subject: HighRiskMakerCheckerSubject;
  readonly makerUserId: string;
  readonly checkerUserId: string;
  readonly auditAction: string | null;
  readonly approvalRequestId?: string | null;
}): void {
  if (!HighRiskMakerCheckerSubjectSet.has(input.subject)) {
    throw new AppError(400, 'MAKER_CHECKER_SUBJECT_NOT_REGISTERED', 'High-risk maker-checker subject is not registered.');
  }
  if (input.makerUserId === input.checkerUserId) {
    throw new AppError(403, 'MAKER_CHECKER_VIOLATION', 'The maker cannot be the checker for this high-risk transaction.', { subject: input.subject });
  }
  if (!input.auditAction) {
    throw new AppError(500, 'MAKER_CHECKER_AUDIT_REQUIRED', 'Maker-checker decision requires audit evidence.', { subject: input.subject });
  }
}
