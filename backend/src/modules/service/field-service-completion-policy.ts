import { AppError } from '../../core/http/errors.js';
import {
  FieldServiceCompletionInvariants,
  FieldServiceCompletionRoutes,
  FieldServiceCompletionSubjects,
  FieldServiceRuntimeScenarios,
} from '@nexora/shared';
import type { WorkOrderState } from './field-service-workflow-policy.js';

export const FieldServiceCompletionControls = [
  'tenant-context-on-ticket-work-order-visit-report-and-part-queries',
  'rbac-for-office-commands-and-assigned-technician-scope-for-mobile-commands',
  'ticket-sla-snapshot-response-resolution-deadlines-and-breach-read-model',
  'work-order-command-state-machine-no-free-status-mutation-for-critical-progress',
  'service-visit-check-in-location-check-out-proof-with-retention-policy',
  'parts-consumption-stock-ledger-linkage-on-work-order-completion',
  'asset-history-linkage-for-field-service-completion',
  'audit-and-domain-events-for-ticket-created-work-order-assigned-completed',
  'postgresql-transaction-boundary-for-work-order-close-and-stock-consumption',
] as const;

export const FieldServiceCriticalCommands = [
  'ticket.create',
  'ticket.assign',
  'ticket.resolve',
  'ticket.close',
  'workorder.create',
  'workorder.assign',
  'workorder.accept',
  'workorder.start_travel',
  'workorder.arrive',
  'workorder.start',
  'workorder.check_in',
  'workorder.record_location',
  'workorder.check_out',
  'service_report.create',
  'workorder.complete',
] as const;

export const FieldServiceCriticalTables = [
  'Ticket',
  'SlaPolicy',
  'WorkOrder',
  'WorkOrderAssignment',
  'TechnicianProfile',
  'ServiceVisit',
  'ServiceVisitLocation',
  'TechnicianLocationPing',
  'TechnicianRoute',
  'WorkOrderCheckIn',
  'WorkOrderCheckOut',
  'ServiceReport',
  'ServiceReportPart',
  'StockTransaction',
  'AssetHistory',
  'AuditLog',
  'BusinessEvent',
] as const;

export const FieldServiceRuntimeCertificationScenarios = FieldServiceRuntimeScenarios;

export function assertFieldServiceCompletionMatrix() {
  if (FieldServiceCompletionSubjects.length < 13) {
    throw new AppError(500, 'M13_FIELD_SERVICE_SUBJECT_COVERAGE_INCOMPLETE', 'Field-service completion subjects are incomplete.');
  }
  if (FieldServiceCompletionRoutes.length < 15) {
    throw new AppError(500, 'M13_FIELD_SERVICE_ROUTE_COVERAGE_INCOMPLETE', 'Field-service completion routes are incomplete.');
  }
  if (FieldServiceCompletionInvariants.length < 12) {
    throw new AppError(500, 'M13_FIELD_SERVICE_INVARIANT_COVERAGE_INCOMPLETE', 'Field-service completion invariants are incomplete.');
  }
  return {
    subjects: FieldServiceCompletionSubjects.length,
    routes: FieldServiceCompletionRoutes.length,
    invariants: FieldServiceCompletionInvariants.length,
    runtimeScenarios: FieldServiceRuntimeCertificationScenarios.length,
    controls: FieldServiceCompletionControls.length,
    commands: FieldServiceCriticalCommands.length,
    tables: FieldServiceCriticalTables.length,
  };
}

export function assertAssignedTechnicianCommandScope(input: {
  assignedTechnicianId: string | null | undefined;
  actorEmployeeId: string | null | undefined;
  command: string;
}) {
  if (!input.assignedTechnicianId || !input.actorEmployeeId || input.assignedTechnicianId !== input.actorEmployeeId) {
    throw new AppError(403, 'M13_ASSIGNED_TECHNICIAN_SCOPE_REQUIRED', 'Field-service mobile command requires the active assigned technician.', {
      command: input.command,
    });
  }
}

export function assertFieldServiceReportCompletionEvidence(input: {
  status: WorkOrderState;
  reportStatus: string | null | undefined;
  completedVisitExists: boolean;
  customerConfirmed: boolean;
  partCount: number;
  linkedPartCount: number;
}) {
  if (!['WORK_IN_PROGRESS', 'WAITING_FOR_PART'].includes(input.status)) {
    throw new AppError(409, 'M13_WORK_ORDER_COMPLETION_ACTIVE_STATE_REQUIRED', 'Work order must be active before field-service completion.', {
      currentStatus: input.status,
    });
  }
  if (input.reportStatus !== 'DRAFT') {
    throw new AppError(409, 'M13_SERVICE_REPORT_DRAFT_REQUIRED', 'Only one draft service report can be finalized during work-order completion.');
  }
  if (!input.completedVisitExists) {
    throw new AppError(409, 'M13_COMPLETED_VISIT_REQUIRED', 'Technician check-out evidence is required before work-order completion.');
  }
  if (!input.customerConfirmed) {
    throw new AppError(400, 'M13_CUSTOMER_CONFIRMATION_REQUIRED', 'Customer confirmation is required before closing a work order.');
  }
  if (input.linkedPartCount > input.partCount) {
    throw new AppError(500, 'M13_SERVICE_PART_LINK_COUNT_INVALID', 'Linked service-part transactions cannot exceed declared service-report parts.');
  }
}

export function assertTechnicianStockSourceScope(input: {
  technicianBranchId: string | null | undefined;
  workOrderBranchId: string | null | undefined;
  warehouseBranchId: string | null | undefined;
  partSource: 'WAREHOUSE' | 'TECHNICIAN_TRUNK';
}) {
  if (input.partSource === 'TECHNICIAN_TRUNK' && input.technicianBranchId && input.workOrderBranchId && input.technicianBranchId !== input.workOrderBranchId) {
    throw new AppError(403, 'M13_TECHNICIAN_STOCK_BRANCH_SCOPE_DENIED', 'Technician trunk stock must belong to the work-order branch.');
  }
  if (input.partSource === 'WAREHOUSE' && input.warehouseBranchId && input.workOrderBranchId && input.warehouseBranchId !== input.workOrderBranchId) {
    throw new AppError(403, 'M13_SERVICE_PART_WAREHOUSE_BRANCH_SCOPE_DENIED', 'Service-part source warehouse must match the work-order branch.');
  }
}

export function assertSlaSnapshotCompleteness(input: {
  responseDueAt: Date | string | null | undefined;
  resolutionDueAt: Date | string | null | undefined;
  responseMinutes: number | null | undefined;
  resolutionMinutes: number | null | undefined;
}) {
  if (!input.responseDueAt || !input.resolutionDueAt || !input.responseMinutes || !input.resolutionMinutes) {
    throw new AppError(500, 'M13_SLA_SNAPSHOT_INCOMPLETE', 'Ticket SLA snapshot must include response and resolution deadline evidence.');
  }
}

export function assertNoAsyncFieldServiceCriticalMutation(sourceText: string) {
  const forbidden = [
    ['new ', 'Queue('].join(''),
    ['Queue', 'Producer'].join(''),
    ['from ', "'bull", "mq'"].join(''),
    ['from ', '"bull', 'mq"'].join(''),
  ];
  for (const marker of forbidden) {
    if (sourceText.includes(marker)) {
      throw new AppError(500, 'M13_FIELD_SERVICE_ASYNC_CRITICAL_MUTATION_FORBIDDEN', 'Field-service critical state cannot be mutated through BullMQ.', { marker });
    }
  }
}
