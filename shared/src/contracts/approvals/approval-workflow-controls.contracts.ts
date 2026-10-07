import { z } from 'zod';
import { PageQuerySchema, UuidSchema } from '../common';

export const Pass16ApprovalWorkflowControlsMaturity =
  'PASS_16_SOURCE_LEVEL_APPROVAL_WORKFLOW_MAKER_CHECKER_FRAUD_RULES_COMPLETION' as const;

export const Pass16ApprovalWorkflowControlManifest = {
  pass: 'PASS_16',
  name: 'Approval Engine, Workflow Engine, Maker-Checker and Fraud Rules',
  purpose:
    'Complete configurable approval/workflow/control-rule surfaces while preserving tenant isolation, service-owned transactions, maker-checker separation and audit evidence.',
  lockedArchitecture: [
    'Fastify /api/v1 remains the business API owner',
    'Workflow rules are tenant-owned records with optional branch scope',
    'Approval and fraud/control decisions run in backend services, never frontend-only',
    'Critical subject state changes are applied by the owning domain facade inside the same PostgreSQL transaction',
    'BullMQ can notify/export after commit but cannot mutate approval, stock, money or accounting state',
  ],
  governedSubjects: [
    'PurchaseRequest',
    'PurchaseOrder',
    'StockAdjustment',
    'StockCountVariance',
    'VendorOnboardingRequest',
    'CustomerInvoice',
    'SupplierInvoice',
    'Expense',
    'Payment',
    'LeaveRequest',
    'PayrollRun',
    'AssetRetirement',
    'AssetDisposal',
    'PurchaseContract',
    'PurchaseReleaseOrder',
    'LandedCost',
    'BankReconciliation',
    'PaymentVoucher',
    'ReceiptVoucher',
  ],
  workflowRuleEndpoints: [
    'GET /api/v1/workflow-rules',
    'GET /api/v1/workflow-rules/:id',
    'POST /api/v1/workflow-rules',
    'PATCH /api/v1/workflow-rules/:id',
    'POST /api/v1/workflow-rules/:id/activate',
    'POST /api/v1/workflow-rules/:id/deactivate',
    'POST /api/v1/workflow-rules/evaluate',
  ],
  controlRules: [
    'invoice_amount_greater_than_po_amount_blocks_supplier_invoice_approval',
    'same_user_creates_vendor_and_payment_requires_secondary_approval',
    'stock_adjustment_above_threshold_requires_warehouse_manager_approval',
    'high_value_purchase_requires_manager_finance_and_director_route',
    'creator_cannot_be_sole_approver_for_high_risk_subject',
    'payment_posting_requires_idempotency_and_approval_policy',
    'bank_reconciliation_close_requires_reversal_reopen_control',
  ],
  auditActions: [
    'WORKFLOW_RULE_CREATED',
    'WORKFLOW_RULE_UPDATED',
    'WORKFLOW_RULE_ACTIVATED',
    'WORKFLOW_RULE_DEACTIVATED',
    'WORKFLOW_RULE_EVALUATED',
    'FRAUD_CONTROL_BLOCKED',
    'FRAUD_CONTROL_REQUIRES_SECONDARY_APPROVAL',
  ],
  runtimeEvidenceRequired: [
    'amount_based_approval_route_selects_correct_approver_steps',
    'creator_cannot_self_approve_high_risk_subject',
    'fraud_rule_blocks_supplier_invoice_when_invoice_exceeds_po',
    'same_user_vendor_and_payment_rule_requires_secondary_approval',
    'stock_adjustment_threshold_rule_requires_approval',
    'workflow_rule_evaluation_is_tenant_scoped_and_permission_guarded',
    'approval_subject_decision_is_applied_inside_transaction_with_audit',
  ],
} as const;

export const WorkflowRuleEffectSchema = z.enum([
  'ALLOW',
  'BLOCK',
  'REQUIRE_APPROVAL',
  'REQUIRE_SECONDARY_APPROVAL',
  'NOTIFY',
]);
export type WorkflowRuleEffect = z.infer<typeof WorkflowRuleEffectSchema>;

export const WorkflowRuleActionSchema = z.object({
  effect: WorkflowRuleEffectSchema,
  approvalSubjectType: z.string().min(1).max(120).optional(),
  approvalDefinitionHint: z.string().min(1).max(160).optional(),
  notificationRoleKey: z.string().min(1).max(160).optional(),
  message: z.string().min(1).max(500).optional(),
});
export type WorkflowRuleAction = z.infer<typeof WorkflowRuleActionSchema>;

const WorkflowJsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const WorkflowRuleConditionOperatorSchema = z.enum([
  'EQ',
  'NE',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'EXISTS',
  'NOT_EXISTS',
]);

export const WorkflowRuleConditionRuleSchema = z.object({
  field: z.string().min(1).max(160),
  operator: WorkflowRuleConditionOperatorSchema,
  value: z.union([WorkflowJsonScalarSchema, z.array(WorkflowJsonScalarSchema)]).optional(),
});

export const WorkflowRuleConditionSchema = z.object({
  all: z.array(WorkflowRuleConditionRuleSchema).optional(),
  any: z.array(WorkflowRuleConditionRuleSchema).optional(),
}).refine(
  (value) => (value.all?.length ?? 0) + (value.any?.length ?? 0) > 0,
  'At least one workflow rule condition is required.',
);

export const WorkflowRuleSeveritySchema = z.enum(['INFO', 'WARNING', 'HIGH', 'CRITICAL']);

export const WorkflowRuleListQuerySchema = PageQuerySchema.extend({
  triggerType: z.string().min(1).max(120).optional(),
  subjectType: z.string().min(1).max(120).optional(),
  active: z.coerce.boolean().optional(),
});

export const CreateWorkflowRuleSchema = z.object({
  triggerType: z.string().min(2).max(120),
  subjectType: z.string().min(2).max(120),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  severity: WorkflowRuleSeveritySchema.default('WARNING'),
  condition: WorkflowRuleConditionSchema,
  actions: z.array(WorkflowRuleActionSchema).min(1),
  active: z.boolean().default(true),
});
export type CreateWorkflowRuleInput = z.infer<typeof CreateWorkflowRuleSchema>;

export const UpdateWorkflowRuleSchema = CreateWorkflowRuleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one workflow rule field must be provided.',
);
export type UpdateWorkflowRuleInput = z.infer<typeof UpdateWorkflowRuleSchema>;

export const EvaluateWorkflowRulesSchema = z.object({
  triggerType: z.string().min(2).max(120),
  subjectType: z.string().min(2).max(120),
  subjectId: UuidSchema.optional(),
  context: z.record(z.string(), z.unknown()),
});
export type EvaluateWorkflowRulesInput = z.infer<typeof EvaluateWorkflowRulesSchema>;

export const WorkflowRuleDataSchema = z.object({
  id: UuidSchema,
  triggerType: z.string(),
  subjectType: z.string(),
  name: z.string(),
  severity: WorkflowRuleSeveritySchema,
  active: z.boolean(),
});
