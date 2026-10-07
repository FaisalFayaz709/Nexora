import { AppError } from '../../core/http/errors.js';

export const MaintenanceTransactionBoundaries = [
  'plan-create:schedule-audit-due-event',
  'schedule-generate:lock-schedule-create-work-order-execution-audit',
  'execution-complete:parts-ledger-schedule-next-due-asset-history-audit',
  'scan-due:discover-only-no-critical-state-mutation',
] as const;

const terminalAssetStatuses = new Set(['REPLACED', 'RETIRED']);
const terminalScheduleStatuses = new Set(['COMPLETED', 'SKIPPED', 'CANCELLED']);
const supportedFrequencyTypes = new Set(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']);

export function assertAssetMaintenanceAllowed(assetStatus: string): void {
  if (terminalAssetStatuses.has(assetStatus)) {
    throw new AppError(
      409,
      'MAINTENANCE_ASSET_TERMINAL',
      'Replaced or retired assets cannot enter maintenance planning or execution.',
      { currentStatus: assetStatus },
    );
  }
}

export function assertRecurringPlanPolicy(input: {
  frequencyType: string;
  intervalValue: number;
  active: boolean;
}): void {
  if (!supportedFrequencyTypes.has(input.frequencyType)) {
    throw new AppError(400, 'MAINTENANCE_FREQUENCY_INVALID', 'Unsupported maintenance frequency type.');
  }
  if (!Number.isInteger(input.intervalValue) || input.intervalValue < 1) {
    throw new AppError(400, 'MAINTENANCE_INTERVAL_INVALID', 'Maintenance interval must be a positive integer.');
  }
  if (input.intervalValue > 1200) {
    throw new AppError(400, 'MAINTENANCE_INTERVAL_TOO_LARGE', 'Maintenance interval exceeds the bounded scheduling policy.');
  }
}

export function nextDueAtFromCycle(base: Date, frequencyType: string, intervalValue: number): Date {
  assertRecurringPlanPolicy({ frequencyType, intervalValue, active: true });
  const next = new Date(base.getTime());
  if (frequencyType === 'DAYS') next.setUTCDate(next.getUTCDate() + intervalValue);
  else if (frequencyType === 'WEEKS') next.setUTCDate(next.getUTCDate() + intervalValue * 7);
  else if (frequencyType === 'MONTHS') next.setUTCMonth(next.getUTCMonth() + intervalValue);
  else if (frequencyType === 'YEARS') next.setUTCFullYear(next.getUTCFullYear() + intervalValue);
  return next;
}

export function assertScheduleCanGenerateWorkOrder(input: {
  status: string;
  generatedWorkOrderId: string | null;
  active?: boolean;
}): void {
  if (input.generatedWorkOrderId) {
    throw new AppError(
      409,
      'MAINTENANCE_SCHEDULE_ALREADY_GENERATED',
      'This maintenance schedule already has a generated work order.',
      { generatedWorkOrderId: input.generatedWorkOrderId },
    );
  }
  if (input.active === false) {
    throw new AppError(409, 'MAINTENANCE_PLAN_INACTIVE', 'Inactive maintenance plan cannot generate a work order.');
  }
  if (terminalScheduleStatuses.has(input.status)) {
    throw new AppError(409, 'MAINTENANCE_SCHEDULE_TERMINAL', 'Terminal maintenance schedule cannot generate a work order.');
  }
}

export function assertOneGeneratedWorkOrderPerSchedule(existingWorkOrderId: string | null): void {
  if (existingWorkOrderId) {
    throw new AppError(
      409,
      'MAINTENANCE_SCHEDULE_WORK_ORDER_DUPLICATE',
      'A maintenance schedule can only be linked to one generated work order.',
      { generatedWorkOrderId: existingWorkOrderId },
    );
  }
}

export function assertExecutionCompletionAllowed(input: {
  executionStatus: string;
  workOrderStatus: string;
}): void {
  if (input.executionStatus === 'COMPLETED') {
    throw new AppError(409, 'MAINTENANCE_EXECUTION_ALREADY_COMPLETED', 'Maintenance execution is already complete.');
  }
  if (input.executionStatus === 'CANCELLED') {
    throw new AppError(409, 'MAINTENANCE_EXECUTION_CANCELLED', 'Cancelled maintenance execution cannot be completed.');
  }
  if (input.workOrderStatus !== 'CLOSED') {
    throw new AppError(
      409,
      'MAINTENANCE_WORK_ORDER_NOT_CLOSED',
      'Maintenance execution can complete only after the generated work order is closed.',
      { workOrderStatus: input.workOrderStatus },
    );
  }
}

export function assertMaintenancePartConsumptionPolicy(input: {
  qty: string;
  batches: Array<{ lotNo: string; qty: string }>;
}): void {
  const qty = Number(input.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError(400, 'MAINTENANCE_PART_QTY_INVALID', 'Maintenance part quantity must be positive.');
  }
  for (const batch of input.batches) {
    const batchQty = Number(batch.qty);
    if (!batch.lotNo || !Number.isFinite(batchQty) || batchQty <= 0) {
      throw new AppError(400, 'MAINTENANCE_PART_BATCH_INVALID', 'Batch allocations require lot number and positive quantity.');
    }
  }
}

export function assertMaintenanceScanWindow(input: {
  requestedAt: Date;
  dueBefore: Date;
}): void {
  if (input.dueBefore.getTime() < input.requestedAt.getTime()) {
    throw new AppError(400, 'MAINTENANCE_SCAN_WINDOW_INVALID', 'Maintenance scan dueBefore cannot be before requestedAt.');
  }
  const maxWindowMs = 31 * 24 * 60 * 60 * 1000;
  if (input.dueBefore.getTime() - input.requestedAt.getTime() > maxWindowMs) {
    throw new AppError(400, 'MAINTENANCE_SCAN_WINDOW_TOO_LARGE', 'Maintenance scan window must be bounded to 31 days or less.');
  }
}

export function createMaintenanceScanJobId(input: { organizationId?: string; dueBefore: string }): string {
  const scope = input.organizationId ?? 'all-tenants';
  return `maintenance.scan:${scope}:${input.dueBefore.slice(0, 13)}`;
}

export function assertNextSchedulePolicy(input: {
  planActive: boolean;
  nextDueAt: Date;
  completedAt: Date;
}): void {
  if (!input.planActive) return;
  if (input.nextDueAt.getTime() <= input.completedAt.getTime()) {
    throw new AppError(409, 'MAINTENANCE_NEXT_DUE_INVALID', 'Next maintenance due date must be after completion time.');
  }
}

export function assertNoAsyncMaintenanceCriticalMutation(operation: string): void {
  const forbidden = ['stock-ledger', 'asset-history', 'work-order-status', 'execution-complete', 'schedule-generate'];
  if (forbidden.some((marker) => operation.includes(marker))) {
    throw new AppError(
      500,
      'MAINTENANCE_ASYNC_CRITICAL_MUTATION_FORBIDDEN',
      'Maintenance scan jobs may discover due schedules, but critical state changes must remain transactional.',
      { operation },
    );
  }
}
