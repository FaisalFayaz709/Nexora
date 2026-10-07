import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Field Service PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'keeps work-order completion parts and service history atomic',
      evidence: 'complete a WorkOrder with ServiceReportPart rows and verify stock consumption, AssetHistory and audit are one transaction',
    },
    {
      name: 'rolls back work-order completion when parts stock is insufficient',
      evidence: 'attempt completion with unavailable spare parts and verify no partial ServiceReport, status transition or stock ledger remains',
    },
    {
      name: 'enforces technician-only visit scope and tenant GPS policy',
      evidence: 'check in and submit location as assigned technician only, respecting OrganizationFeature/ModuleConfiguration location policy',
    },
  ],
});
