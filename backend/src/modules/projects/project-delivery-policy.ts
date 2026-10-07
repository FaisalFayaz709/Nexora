import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export const ProjectDeliveryTransactionBoundary = {
  projectCreation:
    'project + default phase + default budget + number sequence reservation + audit + project.created event',
  bomApproval:
    'BOM status transition + superseded prior approved BOMs + audit; no asynchronous status mutation',
  materialRequirement:
    'approved BOM shortage calculation + procurement material requirement + audit in one PostgreSQL transaction',
  handover:
    'project status HANDED_OVER + handover evidence + audit + project.handed_over event in one PostgreSQL transaction',
  costing:
    'read-only ProjectCostingReadModel from project, budget and procurement facade data',
} as const;

export const ProjectDeliveryChecklist = [
  'tenant-context-required-for-project-queries',
  'customer-site-manager-scope-checked-before-project-create',
  'explicit-project-status-transition-table-only',
  'task-dependencies-must-be-same-project-and-non-self',
  'versioned-bom-replaces-draft-or-creates-new-version',
  'bom-approval-supersedes-other-approved-versions',
  'approved-bom-shortage-is-source-for-material-requirement',
  'budget-vs-actual-vs-committed-uses-decimal-money',
  'handover-is-allowed-only-after-COMPLETED-status',
  'no-async-project-status-budget-bom-or-costing-mutation',
] as const;

const terminalProjectStatuses = new Set(['COMPLETED', 'HANDED_OVER', 'CANCELLED']);

export function assertProjectSchedule(startDate: Date | null, dueDate: Date | null, codePrefix = 'PROJECT') {
  if (startDate && dueDate && dueDate < startDate) {
    throw new AppError(400, `${codePrefix}_DATES_INVALID`, 'Due date cannot precede start date.');
  }
}

export function assertProjectMutable(status: string, command: string) {
  if (terminalProjectStatuses.has(status)) {
    throw new AppError(
      409,
      'PROJECT_COMMAND_PROJECT_CLOSED',
      'This project command is not allowed after project completion, handover or cancellation.',
      { currentStatus: status, command },
    );
  }
}

export function assertProjectStatusTransition(
  currentStatus: string,
  nextStatus: string,
  transitions: Record<string, readonly string[]>,
) {
  if (currentStatus === nextStatus) return;
  const allowed = transitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      409,
      'PROJECT_INVALID_STATE_TRANSITION',
      'Project status transition is not allowed.',
      { currentStatus, requestedStatus: nextStatus },
    );
  }
}

export function assertTaskProgress(status: string, completionPct: number) {
  if (completionPct < 0 || completionPct > 100) {
    throw new AppError(400, 'PROJECT_TASK_PROGRESS_INVALID', 'Task completion percentage must be between 0 and 100.');
  }
  if (status === 'COMPLETED' && completionPct !== 100) {
    throw new AppError(400, 'PROJECT_TASK_COMPLETION_INVALID', 'Completed tasks must be recorded at 100 percent.');
  }
}

export function assertTaskDependencyGraph(currentTaskId: string | undefined, dependencyTaskIds: readonly string[]) {
  const seen = new Set<string>();
  for (const dependencyTaskId of dependencyTaskIds) {
    if (dependencyTaskId === currentTaskId) {
      throw new AppError(400, 'PROJECT_TASK_SELF_DEPENDENCY', 'A task cannot depend on itself.');
    }
    if (seen.has(dependencyTaskId)) {
      throw new AppError(400, 'PROJECT_TASK_DUPLICATE_DEPENDENCY', 'A task dependency can be listed only once.');
    }
    seen.add(dependencyTaskId);
  }
}

export function assertBomCanBeChanged(projectStatus: string, bomStatus?: string) {
  assertProjectMutable(projectStatus, 'PROJECT_BOM_UPSERT');
  if (bomStatus && bomStatus !== 'DRAFT') {
    throw new AppError(409, 'PROJECT_BOM_INVALID_STATE', 'Only a DRAFT BOM can be changed.');
  }
}

export function assertBomLineQuantities(lines: Array<{ productId: string; requiredQty: Prisma.Decimal }>) {
  const productIds = new Set<string>();
  for (const line of lines) {
    if (productIds.has(line.productId)) {
      throw new AppError(400, 'PROJECT_BOM_DUPLICATE_PRODUCT', 'A BOM cannot contain the same product twice.');
    }
    productIds.add(line.productId);
    if (!line.requiredQty.isPositive()) {
      throw new AppError(400, 'PROJECT_BOM_QUANTITY_INVALID', 'BOM required quantity must be positive.');
    }
  }
}

export function calculateBomShortagePlan(input: Array<{
  productId: string;
  requiredQty: Prisma.Decimal;
  reservedQty: Prisma.Decimal;
  issuedQty: Prisma.Decimal;
  freeQty: Prisma.Decimal;
}>) {
  return input.map((item) => {
    const zero = new Prisma.Decimal(0);
    const outstanding = Prisma.Decimal.max(item.requiredQty.sub(item.reservedQty).sub(item.issuedQty), zero);
    const shortageQty = Prisma.Decimal.max(outstanding.sub(item.freeQty), zero);
    return {
      productId: item.productId,
      outstandingQty: outstanding,
      shortageQty,
      coveredByFreeStockQty: Prisma.Decimal.min(outstanding, item.freeQty),
    };
  });
}

export function assertBudgetLineTotals(lines: Array<{ category: string; budgetAmount: Prisma.Decimal }>) {
  const categories = new Set<string>();
  for (const line of lines) {
    if (categories.has(line.category)) {
      throw new AppError(400, 'PROJECT_BUDGET_DUPLICATE_CATEGORY', 'A budget category can appear only once per budget version.');
    }
    categories.add(line.category);
    if (line.budgetAmount.isNegative()) {
      throw new AppError(400, 'PROJECT_BUDGET_AMOUNT_INVALID', 'Budget line amounts cannot be negative.');
    }
  }
  return lines.reduce((sum, line) => sum.add(line.budgetAmount), new Prisma.Decimal(0));
}

export function calculateProjectBudgetSummary(input: {
  totalBudget: Prisma.Decimal;
  committedCost: Prisma.Decimal;
  actualCost: Prisma.Decimal;
}) {
  const committedPlusActual = input.committedCost.add(input.actualCost);
  const availableBudget = input.totalBudget.sub(committedPlusActual);
  const budgetUsedPct = input.totalBudget.isZero()
    ? new Prisma.Decimal(0)
    : committedPlusActual.div(input.totalBudget).mul(100);
  return {
    totalBudget: input.totalBudget,
    committedPlusActual,
    availableBudget,
    budgetUsedPct,
    readiness: 'PROJECT_BUDGET_SUMMARY_READY' as const,
  };
}

export function calculateProjectCostSnapshot(input: {
  contractValue: Prisma.Decimal;
  budget: Prisma.Decimal;
  committedCost: Prisma.Decimal;
  actualMaterialCost: Prisma.Decimal;
  actualOtherCost: Prisma.Decimal;
}) {
  const totalActualCost = input.actualMaterialCost.add(input.actualOtherCost);
  const grossProfit = input.contractValue.sub(totalActualCost);
  const profitMarginPct = input.contractValue.isZero()
    ? new Prisma.Decimal(0)
    : grossProfit.div(input.contractValue).mul(100);
  const budgetSummary = calculateProjectBudgetSummary({
    totalBudget: input.budget,
    committedCost: input.committedCost,
    actualCost: totalActualCost,
  });
  return {
    projectCostingReadModel: 'ProjectCostingReadModel' as const,
    totalActualCost,
    grossProfit,
    profitMarginPct,
    budgetSummary,
  };
}
