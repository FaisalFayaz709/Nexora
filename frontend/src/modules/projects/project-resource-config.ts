import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type ProjectResourceKey = 'projects' | 'project-tasks';
export type ProjectScopedSurfaceKey = 'bom' | 'budget' | 'material-request' | 'costing' | 'timeline' | 'handover';
export type ProjectCommandKey = 'save-draft-bom' | 'approve-bom' | 'save-draft-budget' | 'approve-budget' | 'create-material-request' | 'complete-handover';

export type ProjectCommandConfig = {
  key: ProjectCommandKey;
  label: string;
  method: 'POST' | 'PUT';
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  irreversibleEffects: readonly string[];
};

export type ProjectResourceConfig = {
  key: ProjectResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  endpointMode: 'crud';
  viewPermission: PermissionKey;
  createPermission: PermissionKey;
  updatePermission: PermissionKey;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
};

export type ProjectScopedSurfaceConfig = {
  key: ProjectScopedSurfaceKey;
  title: string;
  routeSuffix: string;
  endpointTemplate: string;
  method: 'GET' | 'POST' | 'PUT';
  permission: PermissionKey;
  description: string;
  readModel: boolean;
  commandKey?: ProjectCommandKey;
  auditNotes: readonly string[];
};

export const ProjectResourceConfigs = {
  projects: {
    key: 'projects',
    title: 'Projects',
    singularTitle: 'Project',
    routeBase: '/projects',
    endpoint: '/projects',
    endpointMode: 'crud',
    viewPermission: 'project.view',
    createPermission: 'project.create',
    updatePermission: 'project.update',
    description: 'Project delivery aggregate connecting customer, contract, site, team, BOM, procurement material request, budget, costing, assets, handover and timeline evidence.',
    columns: [
      { key: 'projectNo', label: 'Project No' },
      { key: 'name', label: 'Project' },
      { key: 'customerId', label: 'Customer' },
      { key: 'contractId', label: 'Contract' },
      { key: 'siteId', label: 'Site' },
      { key: 'managerId', label: 'Manager' },
      { key: 'status', label: 'Status' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'contractValue', label: 'Contract value' },
    ],
    identityFields: ['projectNo', 'name', 'customerId', 'contractId', 'siteId', 'managerId', 'status'],
    profileFields: ['startDate', 'dueDate', 'contractValue', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Tasks, phases and milestones', description: 'Project detail surfaces expose project tasks, phase/milestone evidence and progress without duplicating project ownership.', href: '/project-tasks' },
      { title: 'BOM and material request', description: 'BOM is versioned through /projects/:id/bom and material demand is converted through /projects/:id/material-request.' },
      { title: 'Budget, costing and profitability', description: 'Budget and costing read models keep committed/actual costs separate from editable project fields.' },
      { title: 'Handover and timeline', description: 'Handover requires explicit command evidence and timeline shows chronological project lifecycle events.' },
    ],
  },
  'project-tasks': {
    key: 'project-tasks',
    title: 'Project Tasks',
    singularTitle: 'Project Task',
    routeBase: '/project-tasks',
    endpoint: '/project-tasks',
    endpointMode: 'crud',
    viewPermission: 'project_task.view',
    createPermission: 'project_task.create',
    updatePermission: 'project_task.update',
    description: 'Project task records for assignee, phase, priority, dependency and completion tracking. Task status follows allowed backend transitions and project scope.',
    columns: [
      { key: 'title', label: 'Task' },
      { key: 'projectId', label: 'Project' },
      { key: 'phaseId', label: 'Phase' },
      { key: 'assigneeId', label: 'Assignee' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'completionPct', label: 'Completion %' },
      { key: 'dueDate', label: 'Due date' },
    ],
    identityFields: ['title', 'projectId', 'phaseId', 'assigneeId', 'status', 'priority'],
    profileFields: ['startDate', 'dueDate', 'completionPct', 'dependencyTaskIds', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Dependencies', description: 'Dependencies are stored as explicit task links and cannot be inferred by the browser.' },
      { title: 'Milestone progress', description: 'Task progress contributes to project timeline and milestone views through backend read models.' },
      { title: 'Audit and assignment', description: 'Assignment/status changes remain backend-authoritative and auditable.' },
    ],
  },
} satisfies Record<ProjectResourceKey, ProjectResourceConfig>;

export const ProjectScopedSurfaceConfigs = {
  bom: {
    key: 'bom', title: 'Project BOM', routeSuffix: 'bom', endpointTemplate: '/projects/:id/bom', method: 'GET', permission: 'project.view', readModel: true,
    description: 'Versioned Bill of Materials read/update surface. Draft BOM updates use PUT /projects/:id/bom and approval uses POST /projects/:id/bom/:bomId/approve.',
    auditNotes: ['BOM line arrays are validated by shared Zod contracts.', 'BOM approval creates audit and may supersede previous approved versions.', 'Material shortages can feed procurement material requests.'],
  },
  budget: {
    key: 'budget', title: 'Project Budget', routeSuffix: 'budget', endpointTemplate: '/projects/:id/budget', method: 'GET', permission: 'project.view', readModel: true,
    description: 'Project budget read/update surface showing planned, committed and actual costs. Draft budget saves use PUT /projects/:id/budget and approval uses POST /projects/:id/budget/:budgetId/approve.',
    commandKey: 'save-draft-budget',
    auditNotes: ['Budget line arrays are validated by shared Zod contracts.', 'Budget approval creates audit and supersedes previous approved versions.', 'Budget view separates planned, committed and actual costs.', 'Financial visibility uses project.view_financials when sensitive.', 'Cost figures are not recalculated in the browser.'],
  },
  'material-request': {
    key: 'material-request', title: 'Create Material Requirement', routeSuffix: 'material-request', endpointTemplate: '/projects/:id/material-request', method: 'POST', permission: 'project.update', readModel: false, commandKey: 'create-material-request',
    description: 'Command surface that converts approved BOM shortages into procurement material requirements through the Fastify projects service.',
    auditNotes: ['Requires approved BOM and free-stock shortage calculation.', 'Calls procurement through approved backend facade/transaction boundary.', 'Creates audit evidence and keeps PR/RFQ continuity traceable.'],
  },
  costing: {
    key: 'costing', title: 'Project Costing', routeSuffix: 'costing', endpointTemplate: '/projects/:id/costing', method: 'GET', permission: 'project.view_financials', readModel: true,
    description: 'Project cost and profitability read model. Values come from backend aggregation of material, labor, landed cost, expenses, invoices and payments.',
    auditNotes: ['Sensitive financial fields are permission gated.', 'Uses backend-calculated read model, not frontend math.', 'Links committed and actual costs to procurement, inventory and finance evidence.'],
  },
  timeline: {
    key: 'timeline', title: 'Project Timeline', routeSuffix: 'timeline', endpointTemplate: '/projects/:id/timeline', method: 'GET', permission: 'project.view', readModel: true,
    description: 'Chronological project activity timeline containing creation, task, milestone, BOM, budget, material/procurement and handover events.',
    auditNotes: ['Timeline data remains permission-filtered.', 'Audit and business event records are displayed; the frontend does not invent history.', 'Useful for customer handover and management review.'],
  },
  handover: {
    key: 'handover', title: 'Complete Project Handover', routeSuffix: 'handover', endpointTemplate: '/projects/:id/handover', method: 'POST', permission: 'project.handover', readModel: false, commandKey: 'complete-handover',
    description: 'Customer acceptance and project handover command. Requires evidence and allowed project state before changing project lifecycle status.',
    auditNotes: ['Handover command creates acceptance evidence and audit records.', 'Project status is never freely patched to HANDED_OVER.', 'May enable invoice/service eligibility downstream.'],
  },
} satisfies Record<ProjectScopedSurfaceKey, ProjectScopedSurfaceConfig>;

export const ProjectCommandConfigs: readonly ProjectCommandConfig[] = [
  { key: 'save-draft-bom', label: 'Save draft BOM', method: 'PUT', endpointTemplate: '/projects/:id/bom', requiredPermission: 'project.update', idempotent: true, allowedStates: ['DRAFT', 'PLANNED', 'ACTIVE'], irreversibleEffects: ['Replaces the draft BOM version through Fastify validation.', 'Does not approve or post material demand by itself.'] },
  { key: 'approve-bom', label: 'Approve BOM', method: 'POST', endpointTemplate: '/projects/:id/bom/:bomId/approve', requiredPermission: 'project.approve', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Approves a BOM version and can supersede prior approved BOM versions.', 'Creates audit evidence and enables material requirement creation.'] },
  { key: 'save-draft-budget', label: 'Save draft budget', method: 'PUT', endpointTemplate: '/projects/:id/budget', requiredPermission: 'project.update', idempotent: true, allowedStates: ['DRAFT', 'PLANNED', 'ACTIVE'], irreversibleEffects: ['Replaces the current draft budget lines through Fastify validation.', 'Does not approve or post financial actuals by itself.'] },
  { key: 'approve-budget', label: 'Approve budget', method: 'POST', endpointTemplate: '/projects/:id/budget/:budgetId/approve', requiredPermission: 'project.approve', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Approves a budget version and can supersede prior approved budget versions.', 'Creates audit evidence and enables budget-vs-actual reporting.'] },
  { key: 'create-material-request', label: 'Create material requirement', method: 'POST', endpointTemplate: '/projects/:id/material-request', requiredPermission: 'project.update', idempotent: true, allowedStates: ['PLANNED', 'ACTIVE'], irreversibleEffects: ['Calculates shortage against approved BOM and stock.', 'Creates a procurement material requirement through backend workflow continuity.'] },
  { key: 'complete-handover', label: 'Complete handover', method: 'POST', endpointTemplate: '/projects/:id/handover', requiredPermission: 'project.handover', idempotent: true, allowedStates: ['COMPLETED'], irreversibleEffects: ['Creates customer acceptance evidence.', 'Transitions the project through the explicit handover command and audit trail.'] },
] as const;

export const ProjectCompletionPrinciples = [
  'Project screens must show list, create, detail, edit and command surfaces for project aggregates rather than static dashboards only.',
  'Project status, BOM approval, budget approval, material request creation and handover are command workflows; they are not generic PATCH status edits.',
  'Budget, costing and timeline are backend read models with tenant, branch and permission scope applied server-side.',
  'Project-to-procurement and project-to-asset continuity stays visible through related tabs, timeline and document/audit panels.',
] as const;

export function getProjectResourceConfig(key: ProjectResourceKey): ProjectResourceConfig {
  return ProjectResourceConfigs[key];
}

export function getProjectScopedSurfaceConfig(key: ProjectScopedSurfaceKey): ProjectScopedSurfaceConfig {
  return ProjectScopedSurfaceConfigs[key];
}
