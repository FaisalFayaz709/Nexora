import { z } from 'zod';
import { DecimalStringSchema, IsoDateTimeSchema, UuidSchema } from '../common';

export const MISSING_PASS_M14_SOURCE_PREFLIGHT_MAINTENANCE_PREVENTIVE_CORRECTIVE_WARRANTY_RMA_COMPLETION =
  'MISSING_PASS_M14_SOURCE_PREFLIGHT_MAINTENANCE_PREVENTIVE_CORRECTIVE_WARRANTY_RMA_COMPLETION' as const;

export const PASS_14_SOURCE_LEVEL_MAINTENANCE_WARRANTY_RMA_COMPLETION =
  'PASS_14_SOURCE_LEVEL_MAINTENANCE_WARRANTY_RMA_COMPLETION' as const;

export const MaintenanceCompletionSubjects = [
  'PREVENTIVE_PLAN_ACTIVE_ASSET_CONTRACT_SCOPE',
  'FIRST_AND_NEXT_SCHEDULE_DERIVED_FROM_FREQUENCY',
  'DUE_SCAN_DISCOVER_ONLY_BOUNDED_AND_IDEMPOTENT',
  'SCHEDULE_TO_WORK_ORDER_SINGLE_OCCURRENCE',
  'FIELD_SERVICE_CLOSE_REQUIRED_BEFORE_EXECUTION_COMPLETE',
  'PREVENTIVE_EXECUTION_RESULT_NOTES_AND_CHECKLIST_EVIDENCE',
  'CORRECTIVE_EXECUTION_TICKET_AND_WORK_ORDER_LINKAGE',
  'MAINTENANCE_PART_STOCK_LEDGER_ATOMICITY',
  'ASSET_HISTORY_AND_STATUS_AFTER_MAINTENANCE',
  'WARRANTY_CLAIM_RMA_REVIEW_FOR_FAILED_OR_REPLACED_RESULT',
  'MAINTENANCE_COST_ROLLUP_BY_ASSET_PROJECT_AND_CONTRACT',
  'CROSS_TENANT_BRANCH_AND_PORTAL_SCOPE_DENIAL',
] as const;

export const MaintenanceCompletionRoutes = [
  'GET /api/v1/maintenance/plans',
  'POST /api/v1/maintenance/plans',
  'GET /api/v1/maintenance/schedule',
  'POST /api/v1/maintenance/schedules/:id/generate-work-order',
  'POST /api/v1/maintenance/executions/:id/complete',
] as const;

export const MaintenanceCompletionInvariants = [
  'plans-can-target-only-active-tenant-assets-and-valid-contract-entitlements',
  'schedule-generation-is-idempotency-key-and-row-lock-protected',
  'one-generated-work-order-per-maintenance-schedule-occurrence',
  'maintenance-scan-discovers-due-work-only-and-never-mutates-critical-state',
  'execution-completion-requires-generated-work-order-closed-by-field-service',
  'part-consumption-posts-stock-ledger-in-the-same-postgresql-transaction',
  'schedule-complete-next-schedule-asset-history-and-audit-commit-or-rollback-together',
  'failed-or-replaced-result-produces-warranty-rma-review-event-inside-transaction',
  'maintenance-cost-rollup-is-derived-from-ledger-labor-and-expense-sources-not-manual-overwrite',
  'cross-tenant-branch-portal-identifiers-are-denied-at-service-repository-boundaries',
  'terminal-assets-cannot-create-plan-generate-work-order-or-complete-execution',
  'no-bullmq-critical-mutation-for-work-order-status-stock-ledger-asset-history-or-schedule-state',
] as const;

export const MaintenanceRuntimeScenarios = [
  'M14-PREVENTIVE-PLAN-CREATES-FIRST-SCHEDULE',
  'M14-DUE-SCAN-DISCOVER-ONLY-NO-CRITICAL-MUTATION',
  'M14-SCHEDULE-GENERATES-EXACTLY-ONE-WORK-ORDER-CONCURRENTLY',
  'M14-WORK-ORDER-CLOSE-UNLOCKS-MAINTENANCE-EXECUTION-COMPLETE',
  'M14-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY-ATOMICITY',
  'M14-NEXT-SCHEDULE-FREQUENCY-CALCULATION',
  'M14-FAILED-OR-REPLACED-RESULT-EMITS-WARRANTY-RMA-REVIEW',
  'M14-CORRECTIVE-MAINTENANCE-LINKS-TICKET-WORK-ORDER-ASSET',
  'M14-CROSS-TENANT-BRANCH-ACCESS-DENIED',
  'M14-MAINTENANCE-COST-BY-ASSET-READ-MODEL-RBAC-SCOPED',
  'M14-MAINTENANCE-COMPLETION-RHF-PARTS-FIELD-ARRAY',
] as const;

export const MaintenanceCompletionPartCostSchema = z.object({
  productId: UuidSchema,
  qty: DecimalStringSchema,
  stockTransactionId: UuidSchema.nullable(),
  costAmount: DecimalStringSchema.default('0.00'),
});

export const MaintenanceExecutionCompletionEvidenceSchema = z.object({
  maintenanceExecutionId: UuidSchema,
  maintenanceScheduleId: UuidSchema,
  workOrderId: UuidSchema,
  assetId: UuidSchema,
  result: z.enum(['PASSED', 'REPAIRED', 'FAILED', 'REPLACED']),
  completedAt: IsoDateTimeSchema,
  nextDueAt: IsoDateTimeSchema.nullable(),
  assetHistoryWritten: z.boolean(),
  scheduleCompleted: z.boolean(),
  nextScheduleCreated: z.boolean(),
  parts: z.array(MaintenanceCompletionPartCostSchema),
});

export const MaintenanceWarrantyRmaReviewSchema = z.object({
  maintenanceExecutionId: UuidSchema,
  assetId: UuidSchema,
  workOrderId: UuidSchema,
  result: z.enum(['FAILED', 'REPLACED']),
  reviewRequired: z.literal(true),
  reason: z.enum(['FAILED_MAINTENANCE_RESULT', 'ASSET_REPLACED_DURING_MAINTENANCE']),
});

export const MaintenanceCostByAssetRowSchema = z.object({
  assetId: UuidSchema,
  projectId: UuidSchema.nullable(),
  contractId: UuidSchema.nullable(),
  laborCost: DecimalStringSchema,
  partsCost: DecimalStringSchema,
  expenseCost: DecimalStringSchema,
  totalMaintenanceCost: DecimalStringSchema,
});

export const MaintenanceCompletionRows = MaintenanceRuntimeScenarios.map((scenario, index) => ({
  sequence: index + 1,
  scenario,
  subject: MaintenanceCompletionSubjects[index % MaintenanceCompletionSubjects.length],
  invariant: MaintenanceCompletionInvariants[index % MaintenanceCompletionInvariants.length],
}));

export type MaintenanceCompletionSubject = (typeof MaintenanceCompletionSubjects)[number];
export type MaintenanceCompletionRoute = (typeof MaintenanceCompletionRoutes)[number];
export type MaintenanceRuntimeScenario = (typeof MaintenanceRuntimeScenarios)[number];
