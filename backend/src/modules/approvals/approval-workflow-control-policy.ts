import {
  Pass16ApprovalWorkflowControlManifest,
  type WorkflowRuleAction,
} from '@nexora/shared';
import { AppError } from '../../core/http/errors.js';

export type WorkflowControlDecision = 'ALLOW' | 'REQUIRE_APPROVAL' | 'REQUIRE_SECONDARY_APPROVAL' | 'BLOCK';

export type WorkflowControlEvaluation = {
  readonly decision: WorkflowControlDecision;
  readonly matchedRuleIds: readonly string[];
  readonly messages: readonly string[];
};

const governedSubjects = new Set<string>(Pass16ApprovalWorkflowControlManifest.governedSubjects);
const allowedEffects = new Set(['ALLOW', 'BLOCK', 'REQUIRE_APPROVAL', 'REQUIRE_SECONDARY_APPROVAL', 'NOTIFY']);

export const Pass16WorkflowTransactionBoundary =
  'approval-workflow-subject-decision-plus-control-rule-audit-must-be-applied-by-owning-domain-in-one-postgresql-transaction' as const;

export const Pass16FraudControlRules = {
  supplierInvoiceOverPoAmount: 'invoice_amount_greater_than_po_amount_blocks_supplier_invoice_approval',
  sameUserVendorAndPayment: 'same_user_creates_vendor_and_payment_requires_secondary_approval',
  stockAdjustmentThreshold: 'stock_adjustment_above_threshold_requires_warehouse_manager_approval',
  highValuePurchaseRoute: 'high_value_purchase_requires_manager_finance_and_director_route',
  creatorSoleApprovalBlocked: 'creator_cannot_be_sole_approver_for_high_risk_subject',
} as const;

export function assertPass16WorkflowSubject(subjectType: string) {
  if (!governedSubjects.has(subjectType)) {
    throw new AppError(
      400,
      'WORKFLOW_SUBJECT_TYPE_NOT_GOVERNED',
      'Workflow/control rule subject type is not governed by the Pass 16 manifest.',
      { subjectType },
    );
  }
}

export function assertWorkflowRuleDefinition(input: {
  readonly triggerType: string;
  readonly subjectType: string;
  readonly condition: unknown;
  readonly actions: readonly WorkflowRuleAction[];
}) {
  assertPass16WorkflowSubject(input.subjectType);

  if (!input.triggerType.trim()) {
    throw new AppError(400, 'WORKFLOW_RULE_TRIGGER_REQUIRED', 'Workflow rule trigger type is required.');
  }

  if (input.actions.length === 0) {
    throw new AppError(400, 'WORKFLOW_RULE_ACTION_REQUIRED', 'Workflow rule requires at least one action.');
  }

  for (const action of input.actions) {
    if (!allowedEffects.has(action.effect)) {
      throw new AppError(400, 'WORKFLOW_RULE_ACTION_INVALID', 'Workflow rule contains an unsupported action effect.', { effect: action.effect });
    }

    if ((action.effect === 'REQUIRE_APPROVAL' || action.effect === 'REQUIRE_SECONDARY_APPROVAL') && !action.approvalSubjectType) {
      throw new AppError(
        400,
        'WORKFLOW_RULE_APPROVAL_SUBJECT_REQUIRED',
        'Approval-producing workflow rule actions must name the approval subject type.',
        { effect: action.effect },
      );
    }
  }
}

export function decideWorkflowControl(actions: readonly WorkflowRuleAction[]): WorkflowControlDecision {
  if (actions.some((action) => action.effect === 'BLOCK')) return 'BLOCK';
  if (actions.some((action) => action.effect === 'REQUIRE_SECONDARY_APPROVAL')) return 'REQUIRE_SECONDARY_APPROVAL';
  if (actions.some((action) => action.effect === 'REQUIRE_APPROVAL')) return 'REQUIRE_APPROVAL';
  return 'ALLOW';
}

export function assertFraudControlResult(input: {
  readonly controlId: string;
  readonly decision: WorkflowControlDecision;
  readonly subjectType: string;
}) {
  assertPass16WorkflowSubject(input.subjectType);
  if (input.controlId === Pass16FraudControlRules.supplierInvoiceOverPoAmount && input.decision !== 'BLOCK') {
    throw new AppError(
      409,
      'FRAUD_CONTROL_MUST_BLOCK_SUPPLIER_INVOICE_OVER_PO',
      'Supplier invoice amount above PO amount must block approval until corrected or explicitly overridden.',
      { controlId: input.controlId, decision: input.decision },
    );
  }

  if (input.controlId === Pass16FraudControlRules.sameUserVendorAndPayment && input.decision !== 'REQUIRE_SECONDARY_APPROVAL') {
    throw new AppError(
      409,
      'FRAUD_CONTROL_MUST_REQUIRE_SECONDARY_APPROVAL',
      'Same-user vendor creation and payment workflow must require secondary approval.',
      { controlId: input.controlId, decision: input.decision },
    );
  }

  if (input.controlId === Pass16FraudControlRules.stockAdjustmentThreshold && !['REQUIRE_APPROVAL', 'REQUIRE_SECONDARY_APPROVAL', 'BLOCK'].includes(input.decision)) {
    throw new AppError(
      409,
      'FRAUD_CONTROL_STOCK_ADJUSTMENT_THRESHOLD_UNPROTECTED',
      'Large stock adjustments must be protected by approval, secondary approval or block decision.',
      { controlId: input.controlId, decision: input.decision },
    );
  }
}

export function pass16ApprovalWorkflowControlChecklist() {
  return {
    pass: Pass16ApprovalWorkflowControlManifest.pass,
    maturity: 'PASS_16_SOURCE_LEVEL_APPROVAL_WORKFLOW_MAKER_CHECKER_FRAUD_RULES_COMPLETION',
    governedSubjects: Pass16ApprovalWorkflowControlManifest.governedSubjects,
    workflowRuleEndpoints: Pass16ApprovalWorkflowControlManifest.workflowRuleEndpoints,
    transactionBoundary: Pass16WorkflowTransactionBoundary,
    fraudControlRules: Pass16FraudControlRules,
    auditActions: Pass16ApprovalWorkflowControlManifest.auditActions,
    runtimeEvidenceRequired: Pass16ApprovalWorkflowControlManifest.runtimeEvidenceRequired,
    forbiddenRuntimeOwners: [
      'frontend-only-rule-enforcement',
      'nextjs-business-api-rule-engine',
      'bullmq-approval-state-mutation',
      'direct-prisma-from-routes-or-controllers',
      'free-status-patch-for-approval-or-control-state',
    ],
  } as const;
}
