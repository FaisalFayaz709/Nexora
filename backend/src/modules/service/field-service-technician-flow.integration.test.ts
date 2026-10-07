import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C8 Field Service and Technician Flow PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'C8-FIELD-SERVICE-TICKET-TO-WORK-ORDER-LIFECYCLE',
      evidence: 'create a ticket for an installed asset, assign it, create a work order, assign technician, accept, travel, arrive, check in, start, submit service report, check out and complete close through API command endpoints',
    },
    {
      name: 'C8-FIELD-SERVICE-SLA-COMPLIANCE-SNAPSHOT',
      evidence: 'ticket creation attaches SLA policy, responseDueAt/resolutionDueAt are calculated and first response is set on assignment without client-supplied tenant override',
    },
    {
      name: 'C8-FIELD-SERVICE-TECHNICIAN-ONLY-SCOPE',
      evidence: 'non-assigned technician cannot accept, check in, send location, check out or complete the selected work order',
    },
    {
      name: 'C8-FIELD-SERVICE-PARTS-CONSUMPTION-ATOMICITY',
      evidence: 'work-order completion consumes ServiceReportPart stock, writes StockTransaction rows, links ServiceReportPart.stockTransactionId and records AssetHistory in one rollback-safe transaction',
    },
    {
      name: 'C8-FIELD-SERVICE-GPS-VISIT-POLICY-RETENTION',
      evidence: 'tenant policy controls GPS/photo/signature requirements and expired ServiceVisitLocation/TechnicianLocationPing rows are purged according to retention policy',
    },
    {
      name: 'C8-FIELD-SERVICE-NO-ASYNC-CRITICAL-MUTATION',
      evidence: 'BullMQ may emit PDFs/emails/notifications after commit only; work order status, ticket close, parts stock and asset service history are not completed asynchronously',
    },
  ],
});
