export const C9_MAINTENANCE_PREVENTIVE_CORRECTIVE_FLOW = 'C9_MAINTENANCE_PREVENTIVE_CORRECTIVE_FLOW' as const;

export const MaintenanceLockedLifecycleStages = [
  'MAINTENANCE_PLAN_CREATED_FOR_ACTIVE_ASSET_OR_CONTRACT',
  'FIRST_SCHEDULE_CREATED_FROM_PLAN_START_DATE',
  'BULLMQ_MAINTENANCE_SCAN_DISCOVERS_DUE_SCHEDULES_ONLY',
  'DUE_SCHEDULE_GENERATES_EXACTLY_ONE_WORK_ORDER',
  'GENERATED_WORK_ORDER_FOLLOWS_FIELD_SERVICE_TECHNICIAN_FLOW',
  'WORK_ORDER_CLOSE_UNLOCKS_MAINTENANCE_EXECUTION_COMPLETION',
  'MAINTENANCE_EXECUTION_RECORDS_RESULT_NOTES_AND_PARTS',
  'PARTS_CONSUMPTION_POSTS_STOCK_LEDGER_IN_SAME_TRANSACTION',
  'ASSET_HISTORY_RECORDS_PREVENTIVE_OR_CORRECTIVE_MAINTENANCE',
  'NEXT_SCHEDULE_CREATED_FROM_FREQUENCY_AFTER_COMPLETION',
  'WARRANTY_CLAIM_OR_RMA_CREATED_ONLY_WHEN_RESULT_REQUIRES_IT',
] as const;

export const MaintenanceCommandEndpointManifest = [
  'GET /api/v1/maintenance/plans',
  'POST /api/v1/maintenance/plans',
  'GET /api/v1/maintenance/schedule',
  'POST /api/v1/maintenance/schedules/:id/generate-work-order',
  'POST /api/v1/maintenance/executions/:id/complete',
] as const;

export const MaintenanceWorkerEndpointManifest = [
  'QUEUE maintenance.scan',
  'REPEAT maintenance.scan.hourly',
  'EVENT maintenance.due',
  'IDEMPOTENCY maintenance-schedule-work-order',
] as const;

export const MaintenanceAtomicTransactionRules = [
  'PLAN_CREATE_WITH_FIRST_SCHEDULE_AUDIT_AND_DUE_EVENT_IS_TRANSACTIONAL',
  'GENERATE_WORK_ORDER_LOCKS_SCHEDULE_AND_PRESERVES_ONE_WORK_ORDER_PER_SCHEDULE',
  'EXECUTION_COMPLETION_REQUIRES_CLOSED_WORK_ORDER_AND_POSTS_PARTS_STOCK_LEDGER_TRANSACTIONALLY',
  'NEXT_SCHEDULE_CREATION_AND_ASSET_HISTORY_ARE_IN_THE_COMPLETION_TRANSACTION',
  'MAINTENANCE_SCAN_MAY_BE_ASYNC_BUT_STATUS_WORK_ORDER_STOCK_AND_ASSET_EFFECTS_ARE_NOT_EVENTUALLY_CONSISTENT',
] as const;

export const MaintenancePolicyMarkers = [
  'no-plan-for-retired-or-replaced-asset',
  'schedule-generation-is-idempotent-and-lock-protected',
  'one-generated-work-order-per-schedule',
  'execution-completion-requires-closed-work-order',
  'parts-use-inventory-ledger-not-async',
  'next-due-date-derived-from-plan-frequency',
  'maintenance-scan-window-is-bounded',
  'tenant-branch-scope-enforced-for-plans-and-schedules',
  'maintenance-due-event-is-not-a-state-transition-substitute',
] as const;

export type MaintenanceLockedLifecycleStage = (typeof MaintenanceLockedLifecycleStages)[number];
export type MaintenanceCommandEndpoint = (typeof MaintenanceCommandEndpointManifest)[number];
