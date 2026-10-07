import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C6 Projects BOM Budget Costing runtime acceptance',
  requirements: [
    {
      name: 'C6-PROJECT-SITE-MANAGER-SCOPE',
      evidence:
        'Create project rejects foreign customer, foreign site, foreign manager and mismatched customer-site references under tenant context.',
    },
    {
      name: 'C6-PROJECT-TASK-DEPENDENCY-GUARD',
      evidence:
        'Task create/update rejects self dependencies, duplicate dependencies and dependencies from another project.',
    },
    {
      name: 'C6-PROJECT-BOM-VERSION-APPROVAL',
      evidence:
        'Draft BOM upsert enforces unique positive product lines; approving a new BOM supersedes any previous approved BOM version.',
    },
    {
      name: 'C6-PROJECT-BOM-SHORTAGE-MATERIAL-REQUEST',
      evidence:
        'Approved BOM shortage is calculated from required/reserved/issued/free stock and creates one project material requirement through ProcurementFacade in the same PostgreSQL transaction.',
    },
    {
      name: 'C6-PROJECT-BUDGET-COSTING-READ-MODEL',
      evidence:
        'Project costing returns contract value, budget, committed procurement, actual received-material cost, total cost, gross profit and margin using Decimal values.',
    },
    {
      name: 'C6-PROJECT-TIMELINE-CONTINUITY',
      evidence:
        'Project timeline includes project creation, task, milestone, BOM, budget, material/procurement and handover events in chronological order.',
    },
    {
      name: 'C6-PROJECT-HANDOVER-STATE-GUARD',
      evidence:
        'Handover is denied until project is COMPLETED and then commits handover evidence, project status, audit and project.handed_over event atomically.',
    },
  ],
});
