# Maintenance Source Boundary

## Source-locked

Locked public API:
- GET `/api/v1/maintenance/plans`
- POST `/api/v1/maintenance/plans`
- GET `/api/v1/maintenance/schedule`
- POST `/api/v1/maintenance/schedules/:id/generate-work-order`
- POST `/api/v1/maintenance/executions/:id/complete`

Source entity catalog:
- MaintenancePlan: id, organizationId, assetId, contractId, frequencyType, intervalValue, active
- MaintenanceSchedule: id, maintenancePlanId, dueAt, status, generatedWorkOrderId
- MaintenanceExecution: id, scheduleId, workOrderId, completedAt, result, nextDueAt
- MaintenanceChecklist: id, organizationId, name, version
- MaintenancePart: id, maintenanceExecutionId, productId, qty, stockTransactionId

Source behavior:
- Preventive Maintenance and Corrective Maintenance are baseline capabilities.
- Maintenance schedule can generate a WorkOrder.
- Generate WorkOrder endpoint is idempotent.
- Complete Maintenance updates the next due date.
- `maintenance.due` is the canonical event available in the locked event list.
- Maintenance history must remain connected to Asset and WorkOrder history.

## Implementation-derived, not claimed source-locked

The source does not print:
- exact request/response payloads;
- frequencyType enumeration;
- schedule/execution/result status catalogs;
- a public MaintenanceChecklist CRUD API;
- a public corrective-maintenance standalone route;
- exact WorkOrder payload for Maintenance generation;
- exact maintenance-part warehouse custody semantics.

This implementation therefore derives:
- frequency values `DAYS`, `WEEKS`, `MONTHS`, `YEARS`;
- schedule statuses `SCHEDULED`, `DUE`, `GENERATED`, `COMPLETED`, `SKIPPED`, `CANCELLED`;
- execution statuses `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`;
- result values `PASSED`, `REPAIRED`, `FAILED`, `REPLACED`;
- one support table `MaintenanceChecklistItem` because the source says checklists have 1:N checklist items;
- explicit sourceWarehouse/sourceLocation on MaintenancePart so inventory can be decremented without a hidden technician-stock subsystem;
- corrective maintenance is represented by Field Service WorkOrders and Asset lifecycle integration until a source-locked corrective endpoint exists.

No extra public Maintenance endpoint is introduced.
