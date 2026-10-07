import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export const ProjectCompletionControls = [
  'tenant-scope',
  'rbac',
  'branch-resource-scope',
  'shared-zod-contract',
  'service-owned-status-transition',
  'audit-log',
  'single-postgresql-transaction-for-critical-mutations',
  'no-bullmq-for-critical-project-state',
] as const;

export const ProjectCompletionCriticalCommands = [
  'PROJECT_CREATE',
  'PROJECT_UPDATE_STATUS',
  'PROJECT_TASK_CREATE',
  'PROJECT_TASK_UPDATE',
  'PROJECT_BOM_UPSERT',
  'PROJECT_BOM_APPROVE',
  'PROJECT_BUDGET_UPSERT',
  'PROJECT_BUDGET_APPROVE',
  'PROJECT_MATERIAL_REQUIREMENT_CREATE',
  'PROJECT_HANDOVER',
] as const;

export const ProjectCompletionRuntimeCertificationScenarios = [
  'M11-PROJECT-CREATE-SITE-MANAGER-SCOPE',
  'M11-PROJECT-COMPLETION-READINESS-BLOCKS-OPEN-WORK',
  'M11-PROJECT-BOM-APPROVAL-SUPERSEDES-PRIOR-VERSION',
  'M11-PROJECT-BOM-SHORTAGE-CREATES-MATERIAL-REQUIREMENT',
  'M11-PROJECT-BUDGET-UPsert-AND-APPROVAL-VERSIONING',
  'M11-PROJECT-COSTING-MERGES-PROCUREMENT-AND-FINANCE-COSTS',
  'M11-PROJECT-TIMELINE-HAS-BUDGET-BOM-PROCUREMENT-HANDOVER-EVENTS',
  'M11-PROJECT-HANDOVER-REQUIRES-COMPLETED-STATE',
] as const;

export function assertProjectCompletionMatrix(rows: Array<{
  subject: string;
  tenantScoped: boolean;
  rbacGuarded: boolean;
  sharedContract: boolean;
  serviceOwnedStateTransition: boolean;
  auditRequired: boolean;
  transactionalWhenMutating: boolean;
}>) {
  for (const row of rows) {
    if (!row.tenantScoped || !row.rbacGuarded || !row.sharedContract || !row.serviceOwnedStateTransition) {
      throw new AppError(
        500,
        'PROJECT_COMPLETION_MATRIX_INVALID',
        'Project completion controls are incomplete for a required subject.',
        { subject: row.subject },
      );
    }
    if (row.auditRequired && !row.transactionalWhenMutating) {
      throw new AppError(
        500,
        'PROJECT_COMPLETION_TRANSACTION_AUDIT_INVALID',
        'Project mutating subjects must be transactional when audit is required.',
        { subject: row.subject },
      );
    }
  }
}

export function assertProjectCompletionReadiness(input: {
  openTaskCount: number;
  pendingMilestoneCount: number;
  approvedBomCount: number;
}) {
  if (input.openTaskCount > 0) {
    throw new AppError(
      409,
      'PROJECT_COMPLETION_OPEN_TASKS',
      'Project cannot be completed while open tasks remain.',
      { openTaskCount: input.openTaskCount },
    );
  }
  if (input.pendingMilestoneCount > 0) {
    throw new AppError(
      409,
      'PROJECT_COMPLETION_PENDING_MILESTONES',
      'Project cannot be completed while milestones are pending.',
      { pendingMilestoneCount: input.pendingMilestoneCount },
    );
  }
  if (input.approvedBomCount < 1) {
    throw new AppError(
      409,
      'PROJECT_COMPLETION_APPROVED_BOM_REQUIRED',
      'Project completion requires at least one approved BOM version for material traceability.',
    );
  }
}

export function assertProjectBudgetCanBeChanged(input: {
  projectStatus: string;
  budgetStatus?: string | null;
}) {
  if (['COMPLETED', 'HANDED_OVER', 'CANCELLED'].includes(input.projectStatus)) {
    throw new AppError(
      409,
      'PROJECT_BUDGET_PROJECT_CLOSED',
      'Project budget cannot be changed after completion, handover or cancellation.',
      { projectStatus: input.projectStatus },
    );
  }
  if (input.budgetStatus && input.budgetStatus !== 'DRAFT') {
    throw new AppError(
      409,
      'PROJECT_BUDGET_INVALID_STATE',
      'Only a DRAFT project budget can be changed.',
      { budgetStatus: input.budgetStatus },
    );
  }
}

export function assertProjectBudgetApproval(input: {
  status: string;
  lineCount: number;
  totalBudget: Prisma.Decimal;
}) {
  if (input.status !== 'DRAFT') {
    throw new AppError(
      409,
      'PROJECT_BUDGET_INVALID_STATE',
      'Only a DRAFT project budget can be approved.',
      { status: input.status },
    );
  }
  if (input.lineCount < 1 || !input.totalBudget.isPositive()) {
    throw new AppError(
      409,
      'PROJECT_BUDGET_EMPTY',
      'Project budget approval requires at least one positive budget line.',
    );
  }
}

export function assertProjectCostingLayers(input: {
  contractValue: Prisma.Decimal;
  budget: Prisma.Decimal;
  committedCost: Prisma.Decimal;
  actualMaterialCost: Prisma.Decimal;
  actualOtherCost: Prisma.Decimal;
}) {
  for (const [field, value] of Object.entries(input)) {
    if (value.isNegative()) {
      throw new AppError(
        500,
        'PROJECT_COSTING_LAYER_NEGATIVE',
        'Project costing layers must not contain negative source totals.',
        { field },
      );
    }
  }
}
