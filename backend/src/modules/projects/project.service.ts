import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import type { FinanceFacade } from '../finance/index.js';
import {
  assertBomCanBeChanged,
  assertBomLineQuantities,
  assertBudgetLineTotals,
  assertProjectSchedule,
  assertProjectStatusTransition,
  assertTaskDependencyGraph,
  assertTaskProgress,
  calculateBomShortagePlan,
  calculateProjectBudgetSummary,
  calculateProjectCostSnapshot,
  ProjectDeliveryTransactionBoundary,
} from './project-delivery-policy.js';
import {
  assertProjectBudgetApproval,
  assertProjectBudgetCanBeChanged,
  assertProjectCompletionReadiness,
  assertProjectCostingLayers,
} from './project-completion-policy.js';
import { ProjectRepository } from './project.repository.js';

const projectTransitions: Record<string, readonly string[]> = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  HANDED_OVER: [],
  CANCELLED: [],
};

const taskTransitions: Record<string, readonly string[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  IN_PROGRESS: ['BLOCKED', 'COMPLETED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}

function date(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function decimal(value: string) {
  return new Prisma.Decimal(value);
}

function money(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function qty(value: Prisma.Decimal) {
  return value.toFixed(4);
}

function decimalMax(left: Prisma.Decimal, right: Prisma.Decimal): Prisma.Decimal {
  return left.greaterThan(right) ? left : right;
}

export class ProjectService {
  constructor(
    private readonly numbers: NumberSequenceFacade,
    private readonly customers: CustomerFacade,
    private readonly employees: EmployeeFacade,
    private readonly inventory: InventoryFacade,
    private readonly procurement: ProcurementFacade,
    private readonly access: PlatformAccessFacade,
    private readonly finance?: FinanceFacade,
    private readonly repository = new ProjectRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async assertEnabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'projects');
  }

  async list(tenant: TenantRequestContext, query: any) {
    await this.assertEnabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.list({
      organizationId: tenant.organizationId,
      status: query.status,
      customerId: query.customerId,
      managerId: query.managerId,
      skip: p.skip,
      take: p.take,
    });
    return {
      rows: rows.map((row) => ({
        ...row,
        contractValue: money(row.contractValue),
      })),
      total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }

  async get(tenant: TenantRequestContext, id: string) {
    await this.assertEnabled(tenant.organizationId);
    const row = await this.repository.get(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    return {
      ...row,
      contractValue: money(row.contractValue),
      risks: row.risks.map((risk) => ({
        ...risk,
        probability: risk.probability.toString(),
      })),
      members: row.members.map((member) => ({
        ...member,
        allocationPct: member.allocationPct.toString(),
      })),
    };
  }

  async create(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.assertEnabled(tenant.organizationId);
    await this.customers.customerForProject(tenant.organizationId, input.customerId);
    await this.customers.siteForProject(tenant.organizationId, input.customerId, input.siteId);
    await this.employees.employeeForProject(tenant.organizationId, input.managerId);

    const startDate = date(input.startDate)!;
    const dueDate = date(input.dueDate)!;
    assertProjectSchedule(startDate, dueDate, 'PROJECT');

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: null,
      entityType: 'PROJECT',
      fiscalYear: startDate.getUTCFullYear(),
      targetType: 'Project',
      createTarget: async (tx, projectNo) => {
        const row = await this.repository.create(tx, {
          organizationId: tenant.organizationId,
          customerId: input.customerId,
          contractId: input.contractId,
          siteId: input.siteId,
          projectNo,
          name: input.name,
          managerId: input.managerId,
          startDate,
          dueDate,
          contractValue: decimal(input.contractValue),
        });

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'PROJECT_CREATED',
          subjectType: 'Project',
          subjectId: row.id,
          afterJson: {
            projectNo: row.projectNo,
            customerId: row.customerId,
            siteId: row.siteId,
            managerId: row.managerId,
            status: row.status,
          },
          ip: actor.ip,
        });

        await this.events.append(tx, {
          organizationId: tenant.organizationId,
          type: 'project.created',
          aggregateType: 'Project',
          aggregateId: row.id,
          payload: { projectNo: row.projectNo, customerId: row.customerId },
        });

        return row;
      },
    });
  }

  async update(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.assertEnabled(tenant.organizationId);
    const before = await this.repository.get(tenant.organizationId, id);
    if (!before) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    if (input.managerId) {
      await this.employees.employeeForProject(tenant.organizationId, input.managerId);
    }

    const nextStart = input.startDate ? date(input.startDate)! : before.startDate;
    const nextDue = input.dueDate ? date(input.dueDate)! : before.dueDate;
    assertProjectSchedule(nextStart, nextDue, 'PROJECT');

    if (input.status && input.status !== before.status) {
      assertProjectStatusTransition(before.status, input.status, projectTransitions);
      if (input.status === 'COMPLETED') {
        assertProjectCompletionReadiness(await this.repository.deliveryReadiness(tenant.organizationId, id));
      }
    }

    const row = await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const updated = await repo.updateTenantScoped(tenant.organizationId, id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
        ...(input.startDate !== undefined ? { startDate: nextStart } : {}),
        ...(input.dueDate !== undefined ? { dueDate: nextDue } : {}),
        ...(input.contractValue !== undefined ? { contractValue: decimal(input.contractValue) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: input.status && input.status !== before.status
          ? 'PROJECT_STATUS_CHANGED'
          : 'PROJECT_UPDATED',
        subjectType: 'Project',
        subjectId: id,
        beforeJson: {
          name: before.name,
          managerId: before.managerId,
          startDate: before.startDate,
          dueDate: before.dueDate,
          contractValue: before.contractValue.toString(),
          status: before.status,
        },
        afterJson: {
          name: updated.name,
          managerId: updated.managerId,
          startDate: updated.startDate,
          dueDate: updated.dueDate,
          contractValue: updated.contractValue.toString(),
          status: updated.status,
        },
        ip: actor.ip,
      });
      return updated;
    });

    return {
      ...row,
      contractValue: money(row.contractValue),
    };
  }

  async listTasks(tenant: TenantRequestContext, query: any) {
    await this.assertEnabled(tenant.organizationId);
    const p = page(query);
    const [rows, total] = await this.repository.listTasks({
      organizationId: tenant.organizationId,
      projectId: query.projectId,
      assigneeId: query.assigneeId,
      status: query.status,
      skip: p.skip,
      take: p.take,
    });
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async getTask(tenant: TenantRequestContext, id: string) {
    await this.assertEnabled(tenant.organizationId);
    const row = await this.repository.getTask(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'PROJECT_TASK_NOT_FOUND', 'Project task not found.');
    return row;
  }

  private async validateTaskReferences(
    organizationId: string,
    projectId: string,
    input: any,
    currentTaskId?: string,
  ) {
    const project = await this.repository.get(organizationId, projectId);
    if (!project) throw new AppError(400, 'PROJECT_TASK_PROJECT_INVALID', 'Project does not exist.');

    if (input.phaseId) {
      if (!(await this.repository.phaseBelongsToProject(projectId, input.phaseId))) {
        throw new AppError(400, 'PROJECT_TASK_PHASE_INVALID', 'Task phase does not belong to the selected project.');
      }
    }

    if (input.assigneeId) {
      await this.employees.employeeForProject(organizationId, input.assigneeId);
    }

    assertTaskDependencyGraph(currentTaskId, input.dependencyTaskIds ?? []);

    for (const dependencyId of input.dependencyTaskIds ?? []) {
      if (!(await this.repository.taskBelongsToProject(projectId, dependencyId))) {
        throw new AppError(
          400,
          'PROJECT_TASK_DEPENDENCY_INVALID',
          'Task dependency must belong to the same project.',
        );
      }
    }
  }

  async createTask(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.assertEnabled(tenant.organizationId);
    await this.validateTaskReferences(tenant.organizationId, input.projectId, input);

    assertProjectSchedule(date(input.startDate), date(input.dueDate), 'PROJECT_TASK');
    const taskCompletionPct = input.status === 'COMPLETED' ? 100 : input.completionPct;
    assertTaskProgress(input.status, taskCompletionPct);

    return withTransaction(async (tx) => {
      const row = await this.repository.createTask(tx, {
        projectId: input.projectId,
        phaseId: input.phaseId ?? null,
        assigneeId: input.assigneeId ?? null,
        title: input.title,
        status: input.status,
        priority: input.priority,
        startDate: date(input.startDate),
        dueDate: date(input.dueDate),
        completionPct: taskCompletionPct,
        dependencyTaskIds: input.dependencyTaskIds,
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_TASK_CREATED',
        subjectType: 'ProjectTask',
        subjectId: row.id,
        afterJson: { projectId: row.projectId, title: row.title, status: row.status },
        ip: actor.ip,
      });
      return row;
    });
  }

  async updateTask(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.assertEnabled(tenant.organizationId);
    const before = await this.repository.getTask(tenant.organizationId, id);
    if (!before) throw new AppError(404, 'PROJECT_TASK_NOT_FOUND', 'Project task not found.');

    await this.validateTaskReferences(tenant.organizationId, before.projectId, input, id);

    if (input.status && input.status !== before.status) {
      const allowed = taskTransitions[before.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new AppError(
          409,
          'PROJECT_TASK_INVALID_STATE_TRANSITION',
          'Project task status transition is not allowed.',
          { currentStatus: before.status, requestedStatus: input.status },
        );
      }
    }

    const nextStart = input.startDate === undefined ? before.startDate : date(input.startDate);
    const nextDue = input.dueDate === undefined ? before.dueDate : date(input.dueDate);
    assertProjectSchedule(nextStart, nextDue, 'PROJECT_TASK');
    const nextStatus = input.status ?? before.status;
    const nextCompletionPct = nextStatus === 'COMPLETED'
      ? 100
      : input.completionPct ?? before.completionPct;
    assertTaskProgress(nextStatus, nextCompletionPct);

    return withTransaction(async (tx) => {
      const row = await this.repository.updateTask(
        tx,
        id,
        {
          ...(input.phaseId !== undefined ? { phaseId: input.phaseId } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.startDate !== undefined ? { startDate: nextStart } : {}),
          ...(input.dueDate !== undefined ? { dueDate: nextDue } : {}),
          ...(input.completionPct !== undefined || input.status === 'COMPLETED' ? { completionPct: nextCompletionPct } : {}),
        },
        input.dependencyTaskIds,
      );

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: input.status && input.status !== before.status
          ? 'PROJECT_TASK_STATUS_CHANGED'
          : 'PROJECT_TASK_UPDATED',
        subjectType: 'ProjectTask',
        subjectId: id,
        beforeJson: { status: before.status, completionPct: before.completionPct },
        afterJson: { status: row.status, completionPct: row.completionPct },
        ip: actor.ip,
      });
      return row;
    });
  }

  async getBom(tenant: TenantRequestContext, projectId: string) {
    await this.assertEnabled(tenant.organizationId);
    await this.get(tenant, projectId);
    const bom = await this.repository.latestBom(projectId);
    if (!bom) return null;

    const availability = await this.inventory.freeStockForProject(
      tenant.organizationId,
      bom.items.map((item) => item.productId),
    );

    const shortagePlan = new Map(
      calculateBomShortagePlan(
        bom.items.map((item) => ({
          productId: item.productId,
          requiredQty: item.requiredQty,
          reservedQty: item.reservedQty,
          issuedQty: item.issuedQty,
          freeQty: availability.get(item.productId) ?? new Prisma.Decimal(0),
        })),
      ).map((item) => [item.productId, item]),
    );

    return {
      ...bom,
      deliveryMaturity: ProjectDeliveryTransactionBoundary.materialRequirement,
      items: bom.items.map((item) => {
        const free = availability.get(item.productId) ?? new Prisma.Decimal(0);
        const plan = shortagePlan.get(item.productId)!;
        return {
          ...item,
          requiredQty: qty(item.requiredQty),
          reservedQty: qty(item.reservedQty),
          issuedQty: qty(item.issuedQty),
          outstandingQty: qty(plan.outstandingQty),
          availableFreeQty: qty(free),
          coveredByFreeStockQty: qty(plan.coveredByFreeStockQty),
          shortageQty: qty(plan.shortageQty),
        };
      }),
    };
  }

  async upsertBom(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    input: any,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    assertBomCanBeChanged(project.status);

    const bomLines = input.items.map((item: any) => ({
      productId: item.productId,
      requiredQty: decimal(item.requiredQty),
    }));
    assertBomLineQuantities(bomLines);
    for (const item of bomLines) {
      await this.inventory.getProductForProcurement(tenant.organizationId, item.productId);
    }

    return withTransaction(async (tx) => {
      const row = await this.repository.upsertDraftBom(tx, projectId, bomLines);
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_BOM_DRAFT_SAVED',
        subjectType: 'BillOfMaterials',
        subjectId: row.id,
        afterJson: { projectId, version: row.version, status: row.status, itemCount: row.items.length },
        ip: actor.ip,
      });
      return row;
    });
  }

  async approveBom(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    bomId: string,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    const bom = await this.repository.getBom(projectId, bomId);
    if (!bom) throw new AppError(404, 'PROJECT_BOM_NOT_FOUND', 'BOM not found.');
    if (bom.status !== 'DRAFT') {
      throw new AppError(409, 'PROJECT_BOM_INVALID_STATE', 'Only a DRAFT BOM can be approved.');
    }
    if (!bom.items.length) {
      throw new AppError(409, 'PROJECT_BOM_EMPTY', 'An empty BOM cannot be approved.');
    }

    return withTransaction(async (tx) => {
      await this.repository.supersedeOtherApprovedBoms(tx, projectId, bomId);
      const row = await this.repository.approveBom(tx, bomId);
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_BOM_APPROVED',
        subjectType: 'BillOfMaterials',
        subjectId: bomId,
        beforeJson: { status: 'DRAFT' },
        afterJson: { status: row.status, version: row.version },
        ip: actor.ip,
      });
      return row;
    });
  }

  async upsertBudget(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    input: any,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const latest = await this.repository.latestBudget(projectId);
    assertProjectBudgetCanBeChanged({ projectStatus: project.status, budgetStatus: latest?.status ?? null });

    const lines = input.lines.map((line: any) => ({
      category: line.category,
      budgetAmount: decimal(line.budgetAmount),
    }));
    const totalBudget = assertBudgetLineTotals(lines);

    return withTransaction(async (tx) => {
      const row = await this.repository.upsertDraftBudget(tx, projectId, totalBudget, lines);
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_BUDGET_DRAFT_SAVED',
        subjectType: 'ProjectBudget',
        subjectId: row.id,
        afterJson: {
          projectId,
          version: row.version,
          status: row.status,
          totalBudget: row.totalBudget.toString(),
          lineCount: row.lines.length,
        },
        ip: actor.ip,
      });
      return {
        ...row,
        totalBudget: money(row.totalBudget),
        lines: row.lines.map((line) => ({
          ...line,
          budgetAmount: money(line.budgetAmount),
          committedAmount: money(line.committedAmount),
          actualAmount: money(line.actualAmount),
        })),
      };
    });
  }

  async approveBudget(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    budgetId: string,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    assertProjectBudgetCanBeChanged({ projectStatus: project.status });
    const budget = await this.repository.getBudget(projectId, budgetId);
    if (!budget) throw new AppError(404, 'PROJECT_BUDGET_NOT_FOUND', 'Project budget not found.');
    assertProjectBudgetApproval({
      status: budget.status,
      lineCount: budget.lines.length,
      totalBudget: budget.totalBudget,
    });

    return withTransaction(async (tx) => {
      await this.repository.supersedeOtherApprovedBudgets(tx, projectId, budgetId);
      const row = await this.repository.approveBudget(tx, budgetId);
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_BUDGET_APPROVED',
        subjectType: 'ProjectBudget',
        subjectId: budgetId,
        beforeJson: { status: budget.status },
        afterJson: { status: row.status, version: row.version, totalBudget: row.totalBudget.toString() },
        ip: actor.ip,
      });
      return {
        ...row,
        totalBudget: money(row.totalBudget),
        lines: row.lines.map((line) => ({
          ...line,
          budgetAmount: money(line.budgetAmount),
          committedAmount: money(line.committedAmount),
          actualAmount: money(line.actualAmount),
        })),
      };
    });
  }

  async budget(tenant: TenantRequestContext, projectId: string) {
    await this.assertEnabled(tenant.organizationId);
    await this.get(tenant, projectId);
    const budget = await this.repository.latestBudget(projectId);
    if (!budget) return null;
    const procurement = await this.procurement.projectProcurementReadModel(
      tenant.organizationId,
      projectId,
    );
    const summary = calculateProjectBudgetSummary({
      totalBudget: budget.totalBudget,
      committedCost: procurement.committed,
      actualCost: procurement.receivedMaterial,
    });
    return {
      ...budget,
      totalBudget: money(budget.totalBudget),
      committedCost: money(procurement.committed),
      actualCost: money(procurement.receivedMaterial),
      committedPlusActual: money(summary.committedPlusActual),
      availableBudget: money(summary.availableBudget),
      budgetUsedPct: summary.budgetUsedPct.toFixed(2),
      readiness: summary.readiness,
      lines: budget.lines.map((line) => ({
        ...line,
        budgetAmount: money(line.budgetAmount),
        committedAmount: money(line.committedAmount),
        actualAmount: money(line.actualAmount),
      })),
    };
  }

  async createMaterialRequirement(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    input: any,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const bom = await this.repository.latestBom(projectId);
    if (!bom || bom.status !== 'APPROVED') {
      throw new AppError(
        409,
        'PROJECT_APPROVED_BOM_REQUIRED',
        'An approved BOM is required before creating a material requirement.',
      );
    }

    const requester = input.requestedById
      ? await this.employees.employeeForProject(tenant.organizationId, input.requestedById)
      : await this.employees.employeeForUser(tenant.organizationId, actor.userId);

    const availability = await this.inventory.freeStockForProject(
      tenant.organizationId,
      bom.items.map((item) => item.productId),
    );

    const shortages = calculateBomShortagePlan(
      bom.items.map((item) => ({
        productId: item.productId,
        requiredQty: item.requiredQty,
        reservedQty: item.reservedQty,
        issuedQty: item.issuedQty,
        freeQty: availability.get(item.productId) ?? new Prisma.Decimal(0),
      })),
    )
      .filter((item) => item.shortageQty.isPositive())
      .map((item) => ({ productId: item.productId, qty: item.shortageQty }));

    if (!shortages.length) {
      throw new AppError(
        409,
        'PROJECT_NO_MATERIAL_SHORTAGE',
        'Current free inventory covers the outstanding approved BOM requirement.',
      );
    }

    return withTransaction(async (tx) => {
      const row = await this.procurement.createMaterialRequirementForProject(tx, {
        organizationId: tenant.organizationId,
        projectId,
        requestedById: requester.id,
        items: shortages,
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_MATERIAL_REQUIREMENT_CREATED',
        subjectType: 'Project',
        subjectId: projectId,
        afterJson: {
          materialRequirementId: row.id,
          bomId: bom.id,
          bomVersion: bom.version,
          shortageLines: shortages.map((line) => ({
            productId: line.productId,
            qty: line.qty.toString(),
          })),
        },
        ip: actor.ip,
      });

      return row;
    });
  }

  async costing(tenant: TenantRequestContext, projectId: string) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const budget = await this.repository.latestBudget(projectId);
    const procurement = await this.procurement.projectProcurementReadModel(
      tenant.organizationId,
      projectId,
    );

    const actualMaterialCost = procurement.receivedMaterial;
    const financeCosts = this.finance
      ? await this.finance.projectCostReadModel(tenant.organizationId, projectId)
      : { actualOtherCost: new Prisma.Decimal(0), billedRevenue: new Prisma.Decimal(0) };
    const actualOtherCost = financeCosts.actualOtherCost;
    assertProjectCostingLayers({
      contractValue: project.contractValue,
      budget: budget?.totalBudget ?? new Prisma.Decimal(0),
      committedCost: procurement.committed,
      actualMaterialCost,
      actualOtherCost,
    });
    const snapshot = calculateProjectCostSnapshot({
      contractValue: project.contractValue,
      budget: budget?.totalBudget ?? new Prisma.Decimal(0),
      committedCost: procurement.committed,
      actualMaterialCost,
      actualOtherCost,
    });

    return {
      projectId,
      projectNo: project.projectNo,
      projectCostingReadModel: snapshot.projectCostingReadModel,
      contractValue: money(project.contractValue),
      budget: money(budget?.totalBudget ?? new Prisma.Decimal(0)),
      committedCost: money(procurement.committed),
      actualMaterialCost: money(actualMaterialCost),
      actualOtherCost: money(actualOtherCost),
      billedRevenue: money(financeCosts.billedRevenue),
      totalActualCost: money(snapshot.totalActualCost),
      grossProfit: money(snapshot.grossProfit),
      profitMarginPct: snapshot.profitMarginPct.toFixed(2),
      budgetAvailable: money(snapshot.budgetSummary.availableBudget),
      budgetUsedPct: snapshot.budgetSummary.budgetUsedPct.toFixed(2),
      costingMaturity: 'M11_PROJECT_COSTING_PROCUREMENT_AND_FINANCE_FACADE_READY',
    };
  }

  async handover(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    projectId: string,
    input: any,
  ) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    if (project.status !== 'COMPLETED') {
      throw new AppError(
        409,
        'PROJECT_HANDOVER_INVALID_STATE',
        'Project must be COMPLETED before customer handover.',
        { currentStatus: project.status },
      );
    }
    if (input.acceptedByCustomerId !== project.customerId) {
      throw new AppError(
        400,
        'PROJECT_HANDOVER_CUSTOMER_INVALID',
        'Handover customer must match the project customer.',
      );
    }
    await this.customers.customerForProject(tenant.organizationId, input.acceptedByCustomerId);

    return withTransaction(async (tx) => {
      const handover = await this.repository.createHandover(tx, {
        projectId,
        acceptedByCustomerId: input.acceptedByCustomerId,
        acceptedAt: input.acceptedAt ? new Date(input.acceptedAt) : new Date(),
        documentId: input.documentId ?? null,
      });
      await this.repository.withDb(tx).update(projectId, { status: 'HANDED_OVER' });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PROJECT_HANDED_OVER',
        subjectType: 'Project',
        subjectId: projectId,
        beforeJson: { status: project.status },
        afterJson: {
          status: 'HANDED_OVER',
          handoverId: handover.id,
          acceptedByCustomerId: handover.acceptedByCustomerId,
          acceptedAt: handover.acceptedAt,
        },
        ip: actor.ip,
      });

      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'project.handed_over',
        aggregateType: 'Project',
        aggregateId: projectId,
        payload: {
          projectNo: project.projectNo,
          handoverId: handover.id,
        },
      });

      return handover;
    });
  }

  async timeline(tenant: TenantRequestContext, projectId: string, limit = 100) {
    await this.assertEnabled(tenant.organizationId);
    const project = await this.repository.get(tenant.organizationId, projectId);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const [local, procurement] = await Promise.all([
      this.repository.localTimeline(projectId),
      this.procurement.projectProcurementReadModel(tenant.organizationId, projectId),
    ]);

    const [projectRow, tasks, milestones, boms, budgets, handovers] = local;
    const events: any[] = [];

    if (projectRow) {
      events.push({
        occurredAt: projectRow.createdAt,
        type: 'PROJECT_CREATED',
        referenceType: 'Project',
        referenceId: projectRow.id,
        referenceNo: projectRow.projectNo,
        status: projectRow.status,
      });
    }

    for (const task of tasks) {
      events.push({
        occurredAt: task.createdAt,
        type: 'PROJECT_TASK_CREATED',
        referenceType: 'ProjectTask',
        referenceId: task.id,
        title: task.title,
        status: task.status,
      });
    }

    for (const milestone of milestones) {
      events.push({
        occurredAt: milestone.achievedAt ?? milestone.createdAt,
        type: 'PROJECT_MILESTONE_TRACKED',
        referenceType: 'ProjectMilestone',
        referenceId: milestone.id,
        title: milestone.name,
        status: milestone.status,
      });
    }

    for (const bom of boms) {
      events.push({
        occurredAt: bom.createdAt,
        type: 'PROJECT_BOM_VERSION_CREATED',
        referenceType: 'BillOfMaterials',
        referenceId: bom.id,
        version: bom.version,
        status: bom.status,
      });
    }

    for (const budget of budgets) {
      events.push({
        occurredAt: budget.createdAt,
        type: 'PROJECT_TIMELINE_BUDGET_VERSION',
        referenceType: 'ProjectBudget',
        referenceId: budget.id,
        version: budget.version,
        status: budget.status,
        totalBudget: money(budget.totalBudget),
      });
    }

    for (const handover of handovers) {
      events.push({
        occurredAt: handover.acceptedAt,
        type: 'PROJECT_HANDED_OVER',
        referenceType: 'ProjectHandover',
        referenceId: handover.id,
        status: handover.status,
      });
    }

    events.push(...procurement.timeline);

    return events
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, Math.max(1, Math.min(limit, 250)));
  }
}
