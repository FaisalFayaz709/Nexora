import { describe, expect, it } from 'vitest';
import {
  assertAssetMaintenanceAllowed,
  assertExecutionCompletionAllowed,
  assertMaintenancePartConsumptionPolicy,
  assertMaintenanceScanWindow,
  assertNoAsyncMaintenanceCriticalMutation,
  assertRecurringPlanPolicy,
  assertScheduleCanGenerateWorkOrder,
  createMaintenanceScanJobId,
  nextDueAtFromCycle,
} from './maintenance-workflow-policy.js';

describe('C9 maintenance workflow policy', () => {
  it('C9-MAINTENANCE-NO-PLAN-FOR-TERMINAL-ASSET', () => {
    expect(() => assertAssetMaintenanceAllowed('RETIRED')).toThrow('MAINTENANCE_ASSET_TERMINAL');
    expect(() => assertAssetMaintenanceAllowed('ACTIVE')).not.toThrow();
  });

  it('C9-MAINTENANCE-RECURRING-FREQUENCY-AND-NEXT-DUE', () => {
    assertRecurringPlanPolicy({ frequencyType: 'MONTHS', intervalValue: 3, active: true });
    expect(nextDueAtFromCycle(new Date('2026-01-10T00:00:00.000Z'), 'MONTHS', 3).toISOString()).toBe('2026-04-10T00:00:00.000Z');
  });

  it('C9-MAINTENANCE-ONE-GENERATED-WORK-ORDER-PER-SCHEDULE', () => {
    expect(() => assertScheduleCanGenerateWorkOrder({ status: 'DUE', generatedWorkOrderId: null, active: true })).not.toThrow();
    expect(() => assertScheduleCanGenerateWorkOrder({ status: 'DUE', generatedWorkOrderId: 'wo-1', active: true })).toThrow('MAINTENANCE_SCHEDULE_ALREADY_GENERATED');
  });

  it('C9-MAINTENANCE-EXECUTION-COMPLETION-REQUIRES-CLOSED-WORK-ORDER', () => {
    expect(() => assertExecutionCompletionAllowed({ executionStatus: 'IN_PROGRESS', workOrderStatus: 'CLOSED' })).not.toThrow();
    expect(() => assertExecutionCompletionAllowed({ executionStatus: 'IN_PROGRESS', workOrderStatus: 'WORK_IN_PROGRESS' })).toThrow('MAINTENANCE_WORK_ORDER_NOT_CLOSED');
  });

  it('C9-MAINTENANCE-PARTS-CONSUMPTION-POLICY', () => {
    expect(() => assertMaintenancePartConsumptionPolicy({ qty: '1.0000', batches: [{ lotNo: 'LOT-1', qty: '1.0000' }] })).not.toThrow();
    expect(() => assertMaintenancePartConsumptionPolicy({ qty: '0', batches: [] })).toThrow('MAINTENANCE_PART_QTY_INVALID');
  });

  it('C9-MAINTENANCE-SCAN-WINDOW-BOUNDED-AND-JOB-ID-STABLE', () => {
    assertMaintenanceScanWindow({ requestedAt: new Date('2026-09-05T00:00:00.000Z'), dueBefore: new Date('2026-09-12T00:00:00.000Z') });
    expect(createMaintenanceScanJobId({ organizationId: '11111111-1111-4111-8111-111111111111', dueBefore: '2026-09-12T00:00:00.000Z' })).toContain('maintenance.scan:11111111-1111-4111-8111-111111111111:2026-09-12T00');
  });

  it('C9-MAINTENANCE-NO-ASYNC-CRITICAL-MUTATION', () => {
    expect(() => assertNoAsyncMaintenanceCriticalMutation('discover-due-schedules')).not.toThrow();
    expect(() => assertNoAsyncMaintenanceCriticalMutation('stock-ledger-update-from-worker')).toThrow('MAINTENANCE_ASYNC_CRITICAL_MUTATION_FORBIDDEN');
  });
});
