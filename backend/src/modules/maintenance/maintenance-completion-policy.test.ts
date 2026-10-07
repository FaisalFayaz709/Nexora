import { describe, expect, it } from 'vitest';
import {
  assertCorrectiveMaintenanceLinkage,
  assertMaintenanceCompletionMatrix,
  assertMaintenanceCostRollupPolicy,
  assertMaintenanceExecutionCompletionEvidence,
  assertMaintenanceScanDiscoverOnlyPayload,
  assertMaintenanceScheduleOccurrenceIdempotency,
  assertMaintenanceWarrantyRmaHandoff,
  createMaintenanceWarrantyRmaReviewDecision,
} from './maintenance-completion-policy.js';

describe('M14 maintenance preventive/corrective completion policy', () => {
  it('M14-MAINTENANCE-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    const matrix = assertMaintenanceCompletionMatrix();
    expect(matrix.subjects).toBeGreaterThanOrEqual(12);
    expect(matrix.routes).toBeGreaterThanOrEqual(5);
    expect(matrix.invariants).toBeGreaterThanOrEqual(12);
  });

  it('M14-EXECUTION-COMPLETION-REQUIRES-CLOSED-WORK-ORDER-NEXT-SCHEDULE-ASSET-HISTORY', () => {
    expect(() => assertMaintenanceExecutionCompletionEvidence({
      executionStatus: 'IN_PROGRESS',
      workOrderStatus: 'CLOSED',
      scheduleStatus: 'GENERATED',
      activePlan: true,
      nextScheduleCreated: true,
      assetHistoryWritten: true,
      partCount: 1,
      linkedStockTransactionCount: 1,
    })).not.toThrow();
    expect(() => assertMaintenanceExecutionCompletionEvidence({
      executionStatus: 'IN_PROGRESS',
      workOrderStatus: 'WORK_IN_PROGRESS',
      scheduleStatus: 'GENERATED',
      activePlan: true,
      nextScheduleCreated: true,
      assetHistoryWritten: true,
      partCount: 0,
      linkedStockTransactionCount: 0,
    })).toThrow('M14_MAINTENANCE_WORK_ORDER_CLOSED_REQUIRED');
  });

  it('M14-WARRANTY-RMA-REVIEW-IS-REQUIRED-FOR-FAILED-OR-REPLACED-MAINTENANCE', () => {
    const failed = createMaintenanceWarrantyRmaReviewDecision({ result: 'FAILED', maintenanceExecutionId: 'me-1', assetId: 'asset-1', workOrderId: 'wo-1' });
    expect(failed.reviewRequired).toBe(true);
    expect(failed.payload?.reason).toBe('FAILED_MAINTENANCE_RESULT');
    expect(() => assertMaintenanceWarrantyRmaHandoff({ result: 'FAILED', reviewRequired: true, reviewEventWritten: true })).not.toThrow();
    expect(() => assertMaintenanceWarrantyRmaHandoff({ result: 'FAILED', reviewRequired: false, reviewEventWritten: false })).toThrow('M14_WARRANTY_RMA_REVIEW_EVENT_REQUIRED');
  });

  it('M14-MAINTENANCE-COST-ROLLUP-IS-LEDGER-DERIVED-AND-TENANT-SCOPED', () => {
    expect(() => assertMaintenanceCostRollupPolicy({ tenantScoped: true, source: 'LEDGER_DERIVED', partsCost: '10.00', laborCost: '5.00', expenseCost: '2.50', totalMaintenanceCost: '17.50' })).not.toThrow();
    expect(() => assertMaintenanceCostRollupPolicy({ tenantScoped: false, source: 'LEDGER_DERIVED', partsCost: '1', laborCost: '1', expenseCost: '1', totalMaintenanceCost: '3' })).toThrow('M14_MAINTENANCE_COST_TENANT_SCOPE_REQUIRED');
    expect(() => assertMaintenanceCostRollupPolicy({ tenantScoped: true, source: 'MANUAL_OVERRIDE', partsCost: '1', laborCost: '1', expenseCost: '1', totalMaintenanceCost: '3' })).toThrow('M14_MAINTENANCE_COST_MANUAL_OVERRIDE_FORBIDDEN');
  });

  it('M14-SCHEDULE-OCCURRENCE-GENERATION-IDEMPOTENCY-IS-HASH-GUARDED', () => {
    expect(() => assertMaintenanceScheduleOccurrenceIdempotency({ scheduleId: 'sch-1', generatedWorkOrderId: null, idempotencyKey: 'key-1', requestHashMatches: true })).not.toThrow();
    expect(() => assertMaintenanceScheduleOccurrenceIdempotency({ scheduleId: 'sch-1', generatedWorkOrderId: null, idempotencyKey: null, requestHashMatches: true })).toThrow('M14_MAINTENANCE_IDEMPOTENCY_KEY_REQUIRED');
    expect(() => assertMaintenanceScheduleOccurrenceIdempotency({ scheduleId: 'sch-1', generatedWorkOrderId: 'wo-1', idempotencyKey: 'key-1', requestHashMatches: false })).toThrow('M14_MAINTENANCE_IDEMPOTENCY_HASH_MISMATCH');
  });

  it('M14-MAINTENANCE-SCAN-REMAINS-DISCOVER-ONLY', () => {
    expect(() => assertMaintenanceScanDiscoverOnlyPayload('runMaintenanceScanDiscoverOnly(job)')).not.toThrow();
    expect(() => assertMaintenanceScanDiscoverOnlyPayload('tx.stockTransaction.create({ data })')).toThrow('M14_MAINTENANCE_SCAN_CRITICAL_MUTATION_FORBIDDEN');
  });

  it('M14-CORRECTIVE-MAINTENANCE-LINKS-TICKET-WORK-ORDER-ASSET', () => {
    expect(() => assertCorrectiveMaintenanceLinkage({ corrective: true, ticketId: 'ticket-1', workOrderId: 'wo-1', assetId: 'asset-1' })).not.toThrow();
    expect(() => assertCorrectiveMaintenanceLinkage({ corrective: true, ticketId: null, workOrderId: 'wo-1', assetId: 'asset-1' })).toThrow('M14_CORRECTIVE_MAINTENANCE_LINKAGE_REQUIRED');
  });
});
