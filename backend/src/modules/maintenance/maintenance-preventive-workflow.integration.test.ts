import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C9 Maintenance preventive/corrective workflow acceptance',
  requirements: [
    {
      name: 'C9-MAINTENANCE-PLAN-SCHEDULE-GENERATE-COMPLETE-NEXT-SCHEDULE',
      evidence: 'Create active asset, create MaintenancePlan, verify first schedule, generate one WorkOrder, close generated WorkOrder, complete MaintenanceExecution and verify next schedule is created from the frequency.',
    },
    {
      name: 'C9-MAINTENANCE-SCAN-DISCOVERS-DUE-SCHEDULES-WITHOUT-CRITICAL-STATE-MUTATION',
      evidence: 'Run maintenance.scan with a bounded dueBefore window and verify it discovers due schedules or emits maintenance.due events without directly mutating stock, work order state, asset history or execution completion outside a service transaction.',
    },
    {
      name: 'C9-MAINTENANCE-IDEMPOTENT-WORK-ORDER-GENERATION',
      evidence: 'Call generate-work-order twice for the same MaintenanceSchedule with the same Idempotency-Key and verify exactly one WorkOrder and one MaintenanceExecution exist.',
    },
    {
      name: 'C9-MAINTENANCE-PARTS-CONSUMPTION-ATOMICITY',
      evidence: 'Complete maintenance with spare parts and verify MaintenancePart rows, StockTransaction ledger entries, asset history, schedule completion and next schedule commit or roll back together.',
    },
    {
      name: 'C9-MAINTENANCE-CROSS-TENANT-BRANCH-SCOPE',
      evidence: 'Tenant/branch scoped user cannot list, generate or complete plans/schedules/executions from another organization or unauthorized branch.',
    },
    {
      name: 'C9-MAINTENANCE-WARRANTY-RMA-HANDOFF',
      evidence: 'Failed/replaced maintenance result is eligible for warranty/RMA handoff through asset domain facade without importing asset repositories directly.',
    },
  ],
});
