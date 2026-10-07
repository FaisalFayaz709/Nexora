import { AppError } from '../../core/http/errors.js';
import {
  MaintenanceCompletionInvariants,
  MaintenanceCompletionRoutes,
  MaintenanceCompletionSubjects,
  MaintenanceRuntimeScenarios,
} from '@nexora/shared';

export const MaintenanceCompletionControls = [
  'tenant-and-branch-context-on-plan-schedule-execution-part-and-cost-queries',
  'rbac-for-plan-create-schedule-view-generate-and-execution-complete-commands',
  'preventive-plan-first-schedule-and-due-event-transactional-write',
  'bounded-discover-only-maintenance-scan-through-worker',
  'row-locked-idempotent-schedule-to-work-order-generation',
  'field-service-work-order-closed-before-maintenance-execution-completion',
  'parts-stock-ledger-asset-history-next-schedule-and-audit-atomicity',
  'failed-or-replaced-results-create-warranty-rma-review-event',
  'maintenance-cost-rollup-derived-from-ledger-labor-and-expense-sources',
  'terminal-asset-state-blocks-new-plan-generate-complete-and-rma-loop-abuse',
] as const;

export const MaintenanceCriticalCommands = [
  'maintenance.plan.create',
  'maintenance.schedule.scan',
  'maintenance.schedule.generate_work_order',
  'maintenance.execution.complete',
  'maintenance.execution.consume_part',
  'maintenance.schedule.create_next',
  'maintenance.warranty_rma.review_required',
] as const;

export const MaintenanceCriticalTables = [
  'MaintenancePlan',
  'MaintenanceSchedule',
  'MaintenanceExecution',
  'MaintenancePart',
  'MaintenanceChecklist',
  'WorkOrder',
  'ServiceReport',
  'StockTransaction',
  'AssetHistory',
  'AssetRMA',
  'AuditLog',
  'BusinessEvent',
] as const;

export const MaintenanceCompletionRuntimeCertificationScenarios = MaintenanceRuntimeScenarios;

export function assertMaintenanceCompletionMatrix() {
  if (MaintenanceCompletionSubjects.length < 12) {
    throw new AppError(500, 'M14_MAINTENANCE_SUBJECT_COVERAGE_INCOMPLETE', 'Maintenance completion subjects are incomplete.');
  }
  if (MaintenanceCompletionRoutes.length < 5) {
    throw new AppError(500, 'M14_MAINTENANCE_ROUTE_COVERAGE_INCOMPLETE', 'Maintenance completion routes are incomplete.');
  }
  if (MaintenanceCompletionInvariants.length < 12) {
    throw new AppError(500, 'M14_MAINTENANCE_INVARIANT_COVERAGE_INCOMPLETE', 'Maintenance completion invariants are incomplete.');
  }
  return {
    subjects: MaintenanceCompletionSubjects.length,
    routes: MaintenanceCompletionRoutes.length,
    invariants: MaintenanceCompletionInvariants.length,
    runtimeScenarios: MaintenanceCompletionRuntimeCertificationScenarios.length,
    controls: MaintenanceCompletionControls.length,
    commands: MaintenanceCriticalCommands.length,
    tables: MaintenanceCriticalTables.length,
  };
}

export function assertMaintenanceExecutionCompletionEvidence(input: {
  executionStatus: string;
  workOrderStatus: string;
  scheduleStatus: string;
  activePlan: boolean;
  nextScheduleCreated: boolean;
  assetHistoryWritten: boolean;
  partCount: number;
  linkedStockTransactionCount: number;
}) {
  if (input.executionStatus !== 'IN_PROGRESS') {
    throw new AppError(409, 'M14_MAINTENANCE_EXECUTION_ACTIVE_STATE_REQUIRED', 'Maintenance execution must be in progress before completion.', {
      executionStatus: input.executionStatus,
    });
  }
  if (input.workOrderStatus !== 'CLOSED') {
    throw new AppError(409, 'M14_MAINTENANCE_WORK_ORDER_CLOSED_REQUIRED', 'Generated work order must be closed before completing maintenance execution.', {
      workOrderStatus: input.workOrderStatus,
    });
  }
  if (!['GENERATED', 'DUE', 'SCHEDULED'].includes(input.scheduleStatus)) {
    throw new AppError(409, 'M14_MAINTENANCE_SCHEDULE_COMPLETION_STATE_INVALID', 'Maintenance schedule is not in a completable state.', {
      scheduleStatus: input.scheduleStatus,
    });
  }
  if (input.activePlan && !input.nextScheduleCreated) {
    throw new AppError(500, 'M14_NEXT_SCHEDULE_REQUIRED_FOR_ACTIVE_PLAN', 'Active maintenance plan completion must create the next schedule.');
  }
  if (!input.assetHistoryWritten) {
    throw new AppError(500, 'M14_ASSET_HISTORY_REQUIRED', 'Maintenance completion must write asset history inside the transaction.');
  }
  if (input.linkedStockTransactionCount > input.partCount) {
    throw new AppError(500, 'M14_MAINTENANCE_PART_LEDGER_LINK_COUNT_INVALID', 'Linked stock ledger count cannot exceed declared maintenance parts.');
  }
}

export function createMaintenanceWarrantyRmaReviewDecision(input: {
  result: string;
  maintenanceExecutionId: string;
  assetId: string;
  workOrderId: string;
}) {
  const reviewRequired = input.result === 'FAILED' || input.result === 'REPLACED';
  return {
    reviewRequired,
    payload: reviewRequired
      ? {
          maintenanceExecutionId: input.maintenanceExecutionId,
          assetId: input.assetId,
          workOrderId: input.workOrderId,
          result: input.result,
          reason: input.result === 'REPLACED' ? 'ASSET_REPLACED_DURING_MAINTENANCE' : 'FAILED_MAINTENANCE_RESULT',
        }
      : null,
  };
}

export function assertMaintenanceWarrantyRmaHandoff(input: {
  result: string;
  reviewRequired: boolean;
  reviewEventWritten: boolean;
}) {
  const shouldReview = input.result === 'FAILED' || input.result === 'REPLACED';
  if (shouldReview && (!input.reviewRequired || !input.reviewEventWritten)) {
    throw new AppError(500, 'M14_WARRANTY_RMA_REVIEW_EVENT_REQUIRED', 'Failed or replaced maintenance must create warranty/RMA review evidence.');
  }
  if (!shouldReview && input.reviewEventWritten) {
    throw new AppError(500, 'M14_WARRANTY_RMA_REVIEW_EVENT_UNEXPECTED', 'Passed or repaired maintenance must not create warranty/RMA review events.');
  }
}

export function assertMaintenanceCostRollupPolicy(input: {
  tenantScoped: boolean;
  source: 'LEDGER_DERIVED' | 'MANUAL_OVERRIDE';
  partsCost: string;
  laborCost: string;
  expenseCost: string;
  totalMaintenanceCost: string;
}) {
  if (!input.tenantScoped) {
    throw new AppError(403, 'M14_MAINTENANCE_COST_TENANT_SCOPE_REQUIRED', 'Maintenance cost rollup must be tenant scoped.');
  }
  if (input.source !== 'LEDGER_DERIVED') {
    throw new AppError(409, 'M14_MAINTENANCE_COST_MANUAL_OVERRIDE_FORBIDDEN', 'Maintenance cost rollup must be derived from ledger, labor and expense sources.');
  }
  const sum = Number(input.partsCost) + Number(input.laborCost) + Number(input.expenseCost);
  const total = Number(input.totalMaintenanceCost);
  if (![sum, total].every(Number.isFinite) || Math.abs(sum - total) > 0.01) {
    throw new AppError(409, 'M14_MAINTENANCE_COST_ROLLUP_MISMATCH', 'Maintenance cost rollup total does not match source costs.');
  }
}

export function assertMaintenanceScheduleOccurrenceIdempotency(input: {
  scheduleId: string;
  generatedWorkOrderId: string | null;
  idempotencyKey: string | null | undefined;
  requestHashMatches: boolean;
}) {
  if (!input.idempotencyKey) {
    throw new AppError(400, 'M14_MAINTENANCE_IDEMPOTENCY_KEY_REQUIRED', 'Maintenance schedule work-order generation requires an Idempotency-Key.');
  }
  if (input.generatedWorkOrderId && !input.requestHashMatches) {
    throw new AppError(409, 'M14_MAINTENANCE_IDEMPOTENCY_HASH_MISMATCH', 'Same maintenance idempotency key cannot be reused with a different schedule request.');
  }
}

export function assertMaintenanceScanDiscoverOnlyPayload(sourceText: string) {
  const forbidden = [
    'setScheduleGenerated(',
    'completeExecution(',
    'consumeMaintenancePart(',
    'recordMaintenanceCompletion(',
    'markUnderMaintenance(',
    'tx.maintenanceSchedule.update',
    'tx.workOrder.update',
    'tx.stockTransaction.create',
    'tx.assetHistory.create',
  ];
  for (const marker of forbidden) {
    if (sourceText.includes(marker)) {
      throw new AppError(500, 'M14_MAINTENANCE_SCAN_CRITICAL_MUTATION_FORBIDDEN', 'Maintenance scan worker must remain discover-only.', { marker });
    }
  }
}

export function assertCorrectiveMaintenanceLinkage(input: {
  corrective: boolean;
  ticketId: string | null | undefined;
  workOrderId: string | null | undefined;
  assetId: string | null | undefined;
}) {
  if (input.corrective && (!input.ticketId || !input.workOrderId || !input.assetId)) {
    throw new AppError(409, 'M14_CORRECTIVE_MAINTENANCE_LINKAGE_REQUIRED', 'Corrective maintenance must link ticket, work order and asset evidence.');
  }
}
