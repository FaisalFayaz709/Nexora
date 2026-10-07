import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Maintenance PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'runs preventive maintenance from plan through execution and next schedule',
      evidence: 'create MaintenancePlan, generate due schedule, generate WorkOrder, complete execution and verify nextDueAt is calculated',
    },
    {
      name: 'generates exactly one work order per due maintenance schedule',
      evidence: 'retry generate-work-order for the same MaintenanceSchedule and verify one generatedWorkOrderId is retained',
    },
    {
      name: 'rolls back maintenance completion when required parts stock is insufficient',
      evidence: 'complete maintenance with unavailable parts and verify WorkOrder, MaintenanceExecution and StockTransaction are unchanged',
    },
    {
      name: 'denies cross-tenant asset schedule and work-order identifiers',
      evidence: 'use asset, schedule and work-order IDs from another tenant and expect authorization failure',
    },
  ],
});
