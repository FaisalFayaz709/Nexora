# Maintenance WorkOrder Flow

1. `POST /maintenance/plans` validates the Asset through AssetFacade and creates a MaintenancePlan plus the first MaintenanceSchedule.
2. `GET /maintenance/schedule` returns upcoming schedules with date/branch/site/asset filters.
3. `POST /maintenance/schedules/:id/generate-work-order` requires Idempotency-Key.
4. Generation goes through FieldServiceFacade; Maintenance does not create WorkOrder rows directly.
5. In the Field Service transaction callback Maintenance locks the schedule, creates MaintenanceExecution, links generatedWorkOrderId, records Asset UNDER_MAINTENANCE through AssetFacade, emits `maintenance.due` when due, writes audit and stores the idempotency response.
6. Repeating the same idempotency key and schedule returns the same generated WorkOrder response.

The schedule-to-work-order link and maintenance execution are created atomically with the Field Service WorkOrder.
