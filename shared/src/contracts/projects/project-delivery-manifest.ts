export const ProjectDeliveryManifestId = 'C6_PROJECTS_BOM_BUDGET_COSTING' as const;

export const ProjectDeliveryLifecycle = [
  'PROJECT_CREATED',
  'PROJECT_PHASES_AND_TASKS_PLANNED',
  'PROJECT_MILESTONES_TRACKED',
  'PROJECT_TEAM_ASSIGNED',
  'BILL_OF_MATERIALS_DRAFTED',
  'BILL_OF_MATERIALS_APPROVED',
  'INVENTORY_AVAILABILITY_CHECKED',
  'MATERIAL_SHORTAGE_CALCULATED',
  'MATERIAL_REQUIREMENT_CREATED',
  'PROJECT_BUDGET_REVIEWED',
  'COMMITTED_COST_CAPTURED_FROM_PROCUREMENT',
  'ACTUAL_COST_CAPTURED_FROM_RECEIVING',
  'PROJECT_COSTING_READ_MODEL_UPDATED',
  'PROJECT_TIMELINE_AGGREGATED',
  'PROJECT_HANDOVER_CONTROLLED',
] as const;

export const ProjectDeliveryLockedRoutes = [
  'GET /api/v1/projects',
  'GET /api/v1/projects/:id',
  'POST /api/v1/projects',
  'PATCH /api/v1/projects/:id',
  'GET /api/v1/project-tasks',
  'GET /api/v1/project-tasks/:id',
  'POST /api/v1/project-tasks',
  'PATCH /api/v1/project-tasks/:id',
  'GET /api/v1/projects/:id/bom',
  'PUT /api/v1/projects/:id/bom',
  'POST /api/v1/projects/:id/bom/:bomId/approve',
  'GET /api/v1/projects/:id/budget',
  'POST /api/v1/projects/:id/material-request',
  'GET /api/v1/projects/:id/costing',
  'POST /api/v1/projects/:id/handover',
  'GET /api/v1/projects/:id/timeline',
] as const;

export const ProjectCostCategories = [
  'MATERIAL',
  'LABOUR',
  'TECHNICIAN_LABOUR',
  'TRANSPORTATION',
  'FUEL',
  'ACCOMMODATION',
  'SUBCONTRACTOR',
  'EQUIPMENT_RENTAL',
  'PURCHASE_EXPENSES',
  'MISCELLANEOUS',
] as const;

export const ProjectDeliveryInvariants = [
  'projects-are-tenant-scoped-through-organizationId',
  'project-site-must-belong-to-project-customer',
  'project-manager-and-assignees-must-belong-to-tenant',
  'project-status-changes-use-explicit-state-transition-table',
  'tasks-cannot-depend-on-themselves-or-on-other-project-tasks',
  'completed-tasks-force-completionPct-to-100',
  'draft-bom-can-be-upserted-only-for-open-projects',
  'bom-items-are-unique-by-product-and-positive-quantity',
  'approved-bom-supersedes-previous-approved-version',
  'material-requirement-can-be-created-only-from-approved-bom-shortage',
  'budget-vs-actual-vs-committed-is-derived-from-budget-lines-and-procurement-read-model',
  'project-costing-uses-finance-facade-for-other-actual-costs',
  'approved-budget-supersedes-previous-approved-version',
  'project-completion-requires-no-open-tasks-no-pending-milestones-and-approved-bom',
  'project-costing-uses-decimal-money-and-never-floating-point',
  'project-handover-requires-completed-project-and-matching-customer',
  'critical-project-commands-write-audit-events-and-domain-events-inside-the-same-transaction',
  'BullMQ-is-not-used-for-project-status-budget-bom-material-or-costing-state-mutation',
] as const;

export const ProjectDeliveryTransactionBoundaries = {
  projectCreation:
    'project + default phase + default budget + number sequence reservation + audit + project.created event',
  bomApproval:
    'BOM status transition + superseded prior approved BOMs + audit; no async status mutation',
  materialRequirement:
    'approved BOM shortage calculation + procurement material requirement + audit in one transaction',
  handover:
    'project status HANDED_OVER + handover evidence + audit + project.handed_over event in one transaction',
  costing:
    'read-only materialized calculation from contract value, budget, committed procurement and received-material actuals',
} as const;

export const ProjectDeliveryRuntimeAcceptance = [
  'C6-PROJECT-SITE-MANAGER-SCOPE',
  'C6-PROJECT-TASK-DEPENDENCY-GUARD',
  'C6-PROJECT-BOM-VERSION-APPROVAL',
  'C6-PROJECT-BOM-SHORTAGE-MATERIAL-REQUEST',
  'C6-PROJECT-BUDGET-COSTING-READ-MODEL',
  'M11-PROJECT-COSTING-MERGES-PROCUREMENT-AND-FINANCE-COSTS',
  'M11-PROJECT-BUDGET-UPsert-AND-APPROVAL-VERSIONING',
  'C6-PROJECT-TIMELINE-CONTINUITY',
  'C6-PROJECT-HANDOVER-STATE-GUARD',
] as const;
