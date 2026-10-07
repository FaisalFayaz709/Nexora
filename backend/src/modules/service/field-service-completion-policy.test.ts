import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/http/errors.js';
import {
  assertAssignedTechnicianCommandScope,
  assertFieldServiceCompletionMatrix,
  assertFieldServiceReportCompletionEvidence,
  assertNoAsyncFieldServiceCriticalMutation,
  assertSlaSnapshotCompleteness,
  assertTechnicianStockSourceScope,
} from './field-service-completion-policy.js';

describe('M13 field-service completion policy', () => {
  it('M13-FIELD-SERVICE-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    expect(assertFieldServiceCompletionMatrix()).toMatchObject({
      subjects: 13,
      routes: 15,
      runtimeScenarios: 10,
    });
  });

  it('M13-ASSIGNED-TECHNICIAN-SCOPE-BLOCKS-NON-ASSIGNED-MOBILE-COMMANDS', () => {
    expect(() => assertAssignedTechnicianCommandScope({ assignedTechnicianId: 'tech-a', actorEmployeeId: 'tech-b', command: 'workorder.check_in' })).toThrow(AppError);
  });

  it('M13-WORK-ORDER-COMPLETION-REQUIRES-DRAFT-REPORT-CHECKOUT-CUSTOMER-CONFIRMATION', () => {
    expect(() => assertFieldServiceReportCompletionEvidence({ status: 'WORK_IN_PROGRESS', reportStatus: 'DRAFT', completedVisitExists: true, customerConfirmed: true, partCount: 2, linkedPartCount: 1 })).not.toThrow();
    expect(() => assertFieldServiceReportCompletionEvidence({ status: 'WORK_IN_PROGRESS', reportStatus: 'FINAL', completedVisitExists: true, customerConfirmed: true, partCount: 0, linkedPartCount: 0 })).toThrow(AppError);
    expect(() => assertFieldServiceReportCompletionEvidence({ status: 'WORK_IN_PROGRESS', reportStatus: 'DRAFT', completedVisitExists: false, customerConfirmed: true, partCount: 0, linkedPartCount: 0 })).toThrow(AppError);
    expect(() => assertFieldServiceReportCompletionEvidence({ status: 'WORK_IN_PROGRESS', reportStatus: 'DRAFT', completedVisitExists: true, customerConfirmed: false, partCount: 0, linkedPartCount: 0 })).toThrow(AppError);
  });

  it('M13-TECHNICIAN-STOCK-SOURCE-OBEYS-BRANCH-SCOPE', () => {
    expect(() => assertTechnicianStockSourceScope({ technicianBranchId: 'branch-a', workOrderBranchId: 'branch-b', warehouseBranchId: null, partSource: 'TECHNICIAN_TRUNK' })).toThrow(AppError);
    expect(() => assertTechnicianStockSourceScope({ technicianBranchId: 'branch-a', workOrderBranchId: 'branch-a', warehouseBranchId: 'branch-a', partSource: 'WAREHOUSE' })).not.toThrow();
  });

  it('M13-SLA-SNAPSHOT-REQUIRES-DEADLINES-AND-MINUTES', () => {
    expect(() => assertSlaSnapshotCompleteness({ responseDueAt: new Date(), resolutionDueAt: new Date(), responseMinutes: 30, resolutionMinutes: 240 })).not.toThrow();
    expect(() => assertSlaSnapshotCompleteness({ responseDueAt: null, resolutionDueAt: new Date(), responseMinutes: 30, resolutionMinutes: 240 })).toThrow(AppError);
  });

  it('M13-FIELD-SERVICE-CRITICAL-MUTATION-DOES-NOT-USE-BULLMQ', () => {
    expect(() => assertNoAsyncFieldServiceCriticalMutation('await this.inventory.consumeServicePart(tx, input);')).not.toThrow();
    expect(() => assertNoAsyncFieldServiceCriticalMutation('['import { Queue } from ', '"bull', 'mq"; ', 'new ', 'Queue("service")'].join('')')).toThrow(AppError);
  });
});
