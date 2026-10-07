import { describe, expect, it } from 'vitest';
import {
  assertExecutionCompletionAllowed,
  assertMaintenancePartConsumptionPolicy,
  assertNoAsyncMaintenanceCriticalMutation,
  assertScheduleCanGenerateWorkOrder,
  nextDueAtFromCycle,
} from './maintenance-workflow-policy.js';

describe('M9 maintenance gate invariants', () => {
  it('requires generated work order closure before maintenance execution completion', () => {
    expect(() =>
      assertExecutionCompletionAllowed({
        executionStatus: 'IN_PROGRESS',
        workOrderStatus: 'CLOSED',
      }),
    ).not.toThrow();

    expect(() =>
      assertExecutionCompletionAllowed({
        executionStatus: 'IN_PROGRESS',
        workOrderStatus: 'CUSTOMER_CONFIRMATION',
      }),
    ).toThrow('MAINTENANCE_WORK_ORDER_NOT_CLOSED');
  });

  it('allows exactly one generated work order per due maintenance schedule', () => {
    expect(() =>
      assertScheduleCanGenerateWorkOrder({
        status: 'DUE',
        generatedWorkOrderId: null,
        active: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertScheduleCanGenerateWorkOrder({
        status: 'DUE',
        generatedWorkOrderId: 'wo-1',
        active: true,
      }),
    ).toThrow('MAINTENANCE_SCHEDULE_ALREADY_GENERATED');
  });

  it('keeps part consumption positive and ledger-bound', () => {
    expect(() =>
      assertMaintenancePartConsumptionPolicy({
        qty: '2.0000',
        batches: [{ lotNo: 'LOT-1', qty: '2.0000' }],
      }),
    ).not.toThrow();

    expect(() =>
      assertMaintenancePartConsumptionPolicy({
        qty: '0',
        batches: [],
      }),
    ).toThrow('MAINTENANCE_PART_QTY_INVALID');
  });

  it('calculates next due date deterministically and keeps critical mutations off async workers', () => {
    expect(nextDueAtFromCycle(new Date('2026-09-01T00:00:00.000Z'), 'MONTHS', 3).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );

    expect(() => assertNoAsyncMaintenanceCriticalMutation('maintenance-due-discovery-only')).not.toThrow();
    expect(() => assertNoAsyncMaintenanceCriticalMutation('worker-stock-ledger-update')).toThrow(
      'MAINTENANCE_ASYNC_CRITICAL_MUTATION_FORBIDDEN',
    );
  });
});
