import { ApprovalEnginePassC5Manifest, type ApprovalAction } from '@nexora/shared';
import { AppError } from '../../core/http/errors.js';

type ApprovalStepConfiguration = {
  sequence: number;
  approverType: 'USER' | 'ROLE';
  approverRef: string;
  minApprovals: number;
};

export const ApprovalEngineTransactionBoundary =
  'approval-request-plus-step-plus-action-plus-subject-decision-plus-audit-must-commit-in-one-postgresql-transaction' as const;

export const ApprovalMakerCheckerControl =
  'creator-cannot-approve-reject-or-return-own-high-risk-approval-request' as const;

export const ApprovalEngineAuditActions = [
  'APPROVAL_DEFINITION_CREATED',
  'APPROVAL_REQUEST_CREATED',
  'APPROVAL_APPROVE',
  'APPROVAL_REJECT',
  'APPROVAL_RETURN',
] as const;

const approvedSubjectTypes = new Set<string>(
  ApprovalEnginePassC5Manifest.approvedSubjectTypes,
);

const openApprovalStatuses = new Set(['PENDING', 'IN_PROGRESS']);

export function assertApprovalSubjectType(subjectType: string) {
  if (!approvedSubjectTypes.has(subjectType)) {
    throw new AppError(
      400,
      'APPROVAL_SUBJECT_TYPE_NOT_REGISTERED',
      'Approval subject type is not registered in the C5 approval engine manifest.',
      { subjectType },
    );
  }
}

export function assertApprovalDefinitionConfiguration(input: {
  subjectType: string;
  steps: ApprovalStepConfiguration[];
  condition: unknown;
}) {
  assertApprovalSubjectType(input.subjectType);

  if (input.steps.length === 0) {
    throw new AppError(
      400,
      'APPROVAL_DEFINITION_REQUIRES_STEP',
      'Approval definition requires at least one approval step.',
    );
  }

  const sequences = input.steps.map((step) => step.sequence);
  const uniqueSequences = new Set(sequences);
  if (uniqueSequences.size !== sequences.length) {
    throw new AppError(
      400,
      'APPROVAL_STEP_SEQUENCE_DUPLICATE',
      'Approval step sequences must be unique.',
      { sequences },
    );
  }

  const sorted = [...sequences].sort((a, b) => a - b);
  for (let index = 0; index < sorted.length; index += 1) {
    const expected = index + 1;
    if (sorted[index] !== expected) {
      throw new AppError(
        400,
        'APPROVAL_STEP_SEQUENCE_GAP',
        'Approval step sequences must start at 1 and be contiguous.',
        { expected, actual: sorted[index] },
      );
    }
  }

  for (const step of input.steps) {
    if (step.minApprovals < 1) {
      throw new AppError(
        400,
        'APPROVAL_STEP_MIN_APPROVALS_INVALID',
        'Approval step minApprovals must be at least 1.',
        { sequence: step.sequence },
      );
    }

    if (step.approverType === 'USER' && step.minApprovals !== 1) {
      throw new AppError(
        400,
        'APPROVAL_USER_STEP_SINGLE_APPROVER_ONLY',
        'A USER approval step cannot require more than one approval from the same user.',
        { sequence: step.sequence },
      );
    }
  }
}

export function assertApprovalDecisionAllowed(input: {
  currentStatus: string;
  action: ApprovalAction;
  comment: string | null;
}) {
  if (!openApprovalStatuses.has(input.currentStatus)) {
    throw new AppError(
      409,
      'APPROVAL_REQUEST_INVALID_STATE',
      'Approval request is not open for action.',
      { currentStatus: input.currentStatus },
    );
  }

  if (input.action === 'REJECT' && !input.comment?.trim()) {
    throw new AppError(
      400,
      'APPROVAL_REJECTION_COMMENT_REQUIRED',
      'A rejection comment is required.',
    );
  }
}

export function assertMakerCheckerPolicy(input: {
  requestedById: string;
  actorUserId: string;
  action: ApprovalAction;
  subjectType: string;
}) {
  assertApprovalSubjectType(input.subjectType);

  if (input.requestedById !== input.actorUserId) return;

  throw new AppError(
    403,
    'MAKER_CHECKER_VIOLATION',
    'The creator/requester cannot approve, reject or return their own high-risk approval request.',
    {
      subjectType: input.subjectType,
      action: input.action,
      control: ApprovalMakerCheckerControl,
    },
  );
}

export function approvalEngineChecklist() {
  return {
    pass: ApprovalEnginePassC5Manifest.pass,
    transactionBoundary: ApprovalEngineTransactionBoundary,
    makerCheckerControl: ApprovalMakerCheckerControl,
    auditActions: ApprovalEngineAuditActions,
    forbiddenPatterns: ApprovalEnginePassC5Manifest.forbiddenPatterns,
    runtimeEvidenceRequired: ApprovalEnginePassC5Manifest.runtimeEvidenceRequired,
  };
}
