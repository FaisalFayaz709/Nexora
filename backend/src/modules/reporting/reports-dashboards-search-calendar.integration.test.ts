import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C13 Reports, dashboards, global search and calendar runtime acceptance',
  requirements: [
    {
      name: 'dashboard widgets are role and permission filtered',
      evidence: 'Seed CEO/Finance/Project/Warehouse users, request dashboards and verify every widget permissionScope is included in the user permissions.',
    },
    {
      name: 'report exports run through BullMQ and Document metadata only after request transaction commits',
      evidence: 'Create SavedReport, request CSV/XLSX/PDF exports, verify ReportExecution, report.export job, generated Document link and authorized download.',
    },
    {
      name: 'global search is tenant and permission scoped',
      evidence: 'Seed Project, Asset, Invoice, Ticket search entries in two tenants; verify cross-tenant and unauthorized permission entries never appear.',
    },
    {
      name: 'calendar feed is tenant, branch and permission scoped',
      evidence: 'Seed project deadlines, maintenance dates, leave, site visits, work orders, contract expiries and payment deadlines; verify branch-scoped user receives only allowed events.',
    },
    {
      name: 'saved and scheduled reports cannot bypass RBAC or sensitive fields',
      evidence: 'Attempt to save HR/Finance reports without employee.view/finance.view and expect stable authorization errors before any ReportExecution is created.',
    },
  ],
});
