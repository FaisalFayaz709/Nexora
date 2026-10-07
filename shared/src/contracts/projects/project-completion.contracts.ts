import { z } from 'zod';
import { DecimalStringSchema, NonEmptyStringSchema } from '../common';
import { ProjectBudgetStatusSchema } from './project.contracts';

export const MissingPassM11ProjectCompletionMarker =
  'MISSING_PASS_M11_SOURCE_PREFLIGHT_PROJECT_BOM_BUDGET_COSTING_COMPLETION' as const;

export const ProjectCompletionSubjects = [
  'PROJECT_LIFECYCLE',
  'PROJECT_PHASES_TASKS_MILESTONES',
  'PROJECT_TEAM_ASSIGNMENT',
  'BOM_VERSIONING',
  'BOM_APPROVAL',
  'BOM_SHORTAGE_TO_MATERIAL_REQUIREMENT',
  'BUDGET_VERSIONING',
  'BUDGET_APPROVAL',
  'PROCUREMENT_COMMITTED_COST',
  'RECEIVING_ACTUAL_MATERIAL_COST',
  'FINANCE_ACTUAL_OTHER_COST',
  'PROJECT_COSTING_READ_MODEL',
  'PROJECT_TIMELINE_CONTINUITY',
  'PROJECT_COMPLETION_READINESS',
  'PROJECT_HANDOVER_CONTROL',
] as const;

export const ProjectCompletionRoutes = [
  'GET /api/v1/projects',
  'POST /api/v1/projects',
  'PATCH /api/v1/projects/:id',
  'GET /api/v1/project-tasks',
  'POST /api/v1/project-tasks',
  'GET /api/v1/projects/:id/bom',
  'PUT /api/v1/projects/:id/bom',
  'POST /api/v1/projects/:id/bom/:bomId/approve',
  'GET /api/v1/projects/:id/budget',
  'PUT /api/v1/projects/:id/budget',
  'POST /api/v1/projects/:id/budget/:budgetId/approve',
  'POST /api/v1/projects/:id/material-request',
  'GET /api/v1/projects/:id/costing',
  'POST /api/v1/projects/:id/handover',
  'GET /api/v1/projects/:id/timeline',
] as const;

export const ProjectCompletionInvariants = [
  'project-site-must-belong-to-customer',
  'project-manager-and-task-assignee-must-belong-to-tenant',
  'project-status-transition-table-is-service-owned',
  'project-completion-blocked-until-open-tasks-and-pending-milestones-are-cleared',
  'draft-bom-only-updatable-before-terminal-project-state',
  'approved-bom-supersedes-prior-approved-version',
  'material-requirement-created-only-from-approved-bom-shortage',
  'budget-lines-are-category-unique-and-decimal-money',
  'approved-budget-supersedes-prior-approved-version',
  'budget-read-model-merges-budget-procurement-committed-and-received-actual-cost',
  'costing-read-model-merges-contract-budget-procurement-and-finance-expense-facade-data',
  'handover-requires-completed-project-and-matching-customer',
  'timeline-aggregates-project-task-milestone-bom-budget-handover-and-procurement-events',
  'BullMQ-is-not-used-for-project-status-budget-bom-material-requirement-or-costing-state',
] as const;

export const ProjectCompletionRuntimeScenarios = [
  'M11-PROJECT-CREATE-SITE-MANAGER-SCOPE',
  'M11-PROJECT-COMPLETION-READINESS-BLOCKS-OPEN-WORK',
  'M11-PROJECT-BOM-APPROVAL-SUPERSEDES-PRIOR-VERSION',
  'M11-PROJECT-BOM-SHORTAGE-CREATES-MATERIAL-REQUIREMENT',
  'M11-PROJECT-BUDGET-UPsert-AND-APPROVAL-VERSIONING',
  'M11-PROJECT-COSTING-MERGES-PROCUREMENT-AND-FINANCE-COSTS',
  'M11-PROJECT-TIMELINE-HAS-BUDGET-BOM-PROCUREMENT-HANDOVER-EVENTS',
  'M11-PROJECT-HANDOVER-REQUIRES-COMPLETED-STATE',
  'runtime_project_costing_database_api_ui_test_pending',
] as const;

export const ProjectBudgetCompletionLineSchema = z.object({
  category: NonEmptyStringSchema,
  budgetAmount: DecimalStringSchema,
});

export const UpsertProjectBudgetSchema = z.object({
  status: ProjectBudgetStatusSchema.default('DRAFT'),
  lines: z.array(ProjectBudgetCompletionLineSchema).min(1),
});

export const ProjectCompletionRows = ProjectCompletionSubjects.map((subject) => ({
  subject,
  tenantScoped: true,
  rbacGuarded: true,
  sharedContract: true,
  serviceOwnedStateTransition: true,
  auditRequired: !['PROJECT_COSTING_READ_MODEL', 'PROJECT_TIMELINE_CONTINUITY'].includes(subject),
  transactionalWhenMutating: !['PROJECT_COSTING_READ_MODEL', 'PROJECT_TIMELINE_CONTINUITY'].includes(subject),
}));
