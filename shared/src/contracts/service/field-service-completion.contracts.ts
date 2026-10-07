import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from '../common';

export const MissingPassM13FieldServiceCompletionMarker =
  'MISSING_PASS_M13_SOURCE_PREFLIGHT_FIELD_SERVICE_TICKETS_SLA_WORK_ORDERS_TECHNICIAN_STOCK_COMPLETION' as const;


export const Pass13FieldServiceCompletionMarker =
  'PASS_13_FIELD_SERVICE_OFFLINE_SYNC_COMPLETION_SOURCE_CERTIFIED' as const;

export const Pass13FieldServiceCompletionScope = [
  'tickets-sla-work-orders-technician-flow',
  'visit-check-in-location-check-out-proof',
  'service-report-parts-field-array',
  'offline-sync-idempotent-command-replay',
  'asset-history-and-stock-ledger-atomic-completion',
] as const;

export const FieldServiceCompletionSubjects = [
  'TICKET_SLA_INTAKE',
  'TICKET_ASSIGNMENT_RESPONSE_CLOCK',
  'WORK_ORDER_VALIDATION_ASSIGNMENT',
  'TECHNICIAN_ACCEPT_TRAVEL_ARRIVE_START',
  'TECHNICIAN_VISIT_PROOF_RETENTION',
  'SERVICE_REPORT_DRAFT_TO_FINAL',
  'SERVICE_PART_STOCK_CONSUMPTION',
  'TECHNICIAN_STOCK_SOURCE_SCOPE',
  'CUSTOMER_CONFIRMATION_CLOSE',
  'ASSET_SERVICE_HISTORY_LINK',
  'SLA_BREACH_READ_MODEL',
  'MAINTENANCE_GENERATED_WORK_ORDER_LINKAGE',
  'CROSS_TENANT_AND_BRANCH_DENIAL',
] as const;

export const FieldServiceCompletionRoutes = [
  'POST /api/v1/tickets',
  'POST /api/v1/tickets/:id/assign',
  'POST /api/v1/tickets/:id/resolve',
  'POST /api/v1/tickets/:id/close',
  'POST /api/v1/work-orders',
  'POST /api/v1/work-orders/:id/assign',
  'POST /api/v1/work-orders/:id/accept',
  'POST /api/v1/work-orders/:id/start-travel',
  'POST /api/v1/work-orders/:id/arrive',
  'POST /api/v1/work-orders/:id/start',
  'POST /api/v1/work-orders/:id/check-in',
  'POST /api/v1/work-orders/:id/location',
  'POST /api/v1/work-orders/:id/check-out',
  'POST /api/v1/work-orders/:id/service-report',
  'POST /api/v1/work-orders/:id/complete',
] as const;

export const FieldServiceCompletionInvariants = [
  'ticket-asset-customer-site-placement-is-enforced-before-ticket-create',
  'sla-deadlines-are-snapshotted-on-ticket-open-and-priority-change',
  'work-order-status-uses-command-endpoints-not-free-form-patch',
  'technician-mobile-commands-are-restricted-to-active-assigned-technician',
  'visit-location-and-photo-proof-obey-tenant-visit-policy-and-retention',
  'service-report-cannot-complete-before-customer-confirmed-checkout',
  'service-report-parts-consume-stock-in-the-same-postgresql-transaction',
  'serialized-equipment-uses-asset-install-replace-flow-not-anonymous-service-part',
  'batch-tracked-service-parts-require-lot-allocation-equal-to-part-quantity',
  'completion-updates-work-order-ticket-technician-asset-history-and-audit-atomically',
  'field-service-critical-state-is-never-mutated-through-bullmq-or-after-commit-events',
  'cross-tenant-and-branch-scoped-work-order-access-is-denied',
] as const;

export const FieldServiceRuntimeScenarios = [
  'M13-RUNTIME-TICKET-SLA-CREATED-WITH-ASSET-PLACEMENT-GUARD',
  'M13-RUNTIME-TICKET-ASSIGNMENT-SETS-FIRST-RESPONSE-ONCE',
  'M13-RUNTIME-WORK-ORDER-ASSIGN-ACCEPT-TRAVEL-ARRIVE-START',
  'M13-RUNTIME-TECHNICIAN-SCOPE-DENIES-NON-ASSIGNED-USER',
  'M13-RUNTIME-VISIT-PROOF-RETENTION-AND-CHECKOUT-SIGNATURE',
  'M13-RUNTIME-SERVICE-REPORT-PARTS-CONSUME-STOCK-ONCE',
  'M13-RUNTIME-BATCH-SERVICE-PART-ALLOCATION-MUST-MATCH-QUANTITY',
  'M13-RUNTIME-WORK-ORDER-COMPLETE-UPDATES-ASSET-HISTORY',
  'M13-RUNTIME-CUSTOMER-CONFIRMATION-REQUIRED-BEFORE-CLOSE',
  'M13-RUNTIME-CROSS-TENANT-WORK-ORDER-DENIED',
] as const;

export const ServicePartConsumptionLineSchema = z.object({
  productId: UuidSchema,
  qty: DecimalStringSchema,
  sourceWarehouseId: UuidSchema,
  sourceLocationId: UuidSchema.nullable().optional(),
  batchAllocations: z.array(z.object({ lotNo: z.string().min(1).max(120), qty: DecimalStringSchema })).default([]),
  stockTransactionId: UuidSchema.nullable().optional(),
});

export const WorkOrderCompletionEvidenceSchema = z.object({
  workOrderId: UuidSchema,
  serviceReportId: UuidSchema,
  serviceVisitId: UuidSchema,
  technicianId: UuidSchema,
  customerConfirmed: z.literal(true),
  consumedParts: z.array(ServicePartConsumptionLineSchema),
  closedAt: z.string().datetime(),
});

export type WorkOrderCompletionEvidence = z.infer<typeof WorkOrderCompletionEvidenceSchema>;

export const FieldServiceCompletionRows = FieldServiceCompletionSubjects.map((subject) => ({
  subject,
  routeCoverage: FieldServiceCompletionRoutes,
  invariantCoverage: FieldServiceCompletionInvariants,
  runtimeScenarios: FieldServiceRuntimeScenarios,
}));
