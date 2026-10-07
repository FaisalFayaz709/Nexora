import { createHash } from 'node:crypto';
import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { AssetFacade } from '../assets/index.js';
import type { FieldServiceFacade } from '../service/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { MaintenanceRepository } from './maintenance.repository.js';
import {
  assertAssetMaintenanceAllowed,
  assertExecutionCompletionAllowed,
  assertMaintenancePartConsumptionPolicy,
  assertNoAsyncMaintenanceCriticalMutation,
  assertRecurringPlanPolicy,
  assertScheduleCanGenerateWorkOrder,
  assertOneGeneratedWorkOrderPerSchedule,
  assertNextSchedulePolicy,
  nextDueAtFromCycle,
} from './maintenance-workflow-policy.js';
import { createMaintenanceWarrantyRmaReviewDecision } from './maintenance-completion-policy.js';

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function addInterval(base: Date, frequencyType: string, intervalValue: number) {
  const next = new Date(base.getTime());
  if (frequencyType === 'DAYS') next.setUTCDate(next.getUTCDate() + intervalValue);
  else if (frequencyType === 'WEEKS') next.setUTCDate(next.getUTCDate() + intervalValue * 7);
  else if (frequencyType === 'MONTHS') next.setUTCMonth(next.getUTCMonth() + intervalValue);
  else if (frequencyType === 'YEARS') next.setUTCFullYear(next.getUTCFullYear() + intervalValue);
  else throw new AppError(400, 'MAINTENANCE_FREQUENCY_INVALID', 'Unsupported maintenance frequency type.');
  return next;
}

export class MaintenanceService {
  constructor(
    private readonly assets: AssetFacade,
    private readonly fieldService: FieldServiceFacade,
    private readonly inventory: InventoryFacade,
    private readonly access: PlatformAccessFacade,
    private readonly repository = new MaintenanceRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'maintenance');
  }

  async listPlans(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listPlans({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      assetId: query.assetId,
      active: query.active,
      frequencyType: query.frequencyType,
      skip: p.skip,
      take: p.take,
    });
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async createPlan(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const asset = await this.assets.assertAsset(tenant.organizationId, input.assetId);
    assertAssetMaintenanceAllowed(asset.status);
    assertRecurringPlanPolicy({
      frequencyType: input.frequencyType,
      intervalValue: input.intervalValue,
      active: input.active,
    });

    if (input.checklistId) {
      const existing = await this.repository.getChecklist(tenant.organizationId, input.checklistId);
      if (!existing) throw new AppError(404, 'MAINTENANCE_CHECKLIST_NOT_FOUND', 'Maintenance checklist not found.');
    }

    const firstDueAt = dateOnly(input.startAt);
    assertNoAsyncMaintenanceCriticalMutation('plan-create-transactional-schedule-audit-due-event');
    return withTransaction(async (tx) => {
      let checklistId = input.checklistId ?? null;
      if (input.checklist) {
        const checklist = await this.repository.createChecklist(tx, {
          organizationId: tenant.organizationId,
          name: input.checklist.name,
          version: input.checklist.version,
          items: input.checklist.items,
        });
        checklistId = checklist.id;
      }

      const row = await this.repository.createPlan(tx, {
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
        assetId: input.assetId,
        contractId: input.contractId ?? null,
        checklistId,
        name: input.name,
        frequencyType: input.frequencyType,
        intervalValue: input.intervalValue,
        active: input.active,
        firstDueAt,
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'MAINTENANCE_PLAN_CREATED',
        subjectType: 'MaintenancePlan',
        subjectId: row.id,
        afterJson: {
          assetId: row.assetId,
          contractId: row.contractId,
          frequencyType: row.frequencyType,
          intervalValue: row.intervalValue,
          firstScheduleId: row.schedules[0]?.id ?? null,
          firstDueAt,
        },
        ip: actor.ip,
      });

      if (firstDueAt.getTime() <= Date.now()) {
        await this.events.append(tx, {
          organizationId: tenant.organizationId,
          type: 'maintenance.due',
          aggregateType: 'MaintenanceSchedule',
          aggregateId: row.schedules[0]?.id ?? row.id,
          payload: { maintenancePlanId: row.id, assetId: row.assetId, dueAt: firstDueAt.toISOString() },
        });
      }

      return row;
    });
  }

  async schedule(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const from = query.from ? dateOnly(query.from) : undefined;
    const to = query.to ? dateOnly(query.to) : undefined;
    if (from && to && to < from) {
      throw new AppError(400, 'MAINTENANCE_DATE_RANGE_INVALID', 'Maintenance schedule end date cannot precede start date.');
    }
    if (tenant.branchId && query.branchId && query.branchId !== tenant.branchId) {
      throw new AppError(403, 'MAINTENANCE_BRANCH_SCOPE_DENIED', 'Requested branch is outside active branch scope.');
    }

    const { rows, total } = await this.repository.listSchedules({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId ?? query.branchId ?? null,
      from,
      to,
      siteId: query.siteId,
      assetId: query.assetId,
      status: query.status,
      skip: p.skip,
      take: p.take,
    });

    const now = Date.now();
    return {
      rows: rows.map((row: any) => ({
        ...row,
        effectiveStatus: row.status === 'SCHEDULED' && row.dueAt.getTime() <= now ? 'DUE' : row.status,
      })),
      total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }

  async generateWorkOrder(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    scheduleId: string,
    idempotencyKey: string,
  ) {
    await this.enabled(tenant.organizationId);
    if (!idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required for maintenance work-order generation.');
    const route = '/api/v1/maintenance/schedules/:id/generate-work-order';
    const requestHash = hash({ scheduleId });
    const existing = await this.repository.findIdempotency(tenant.organizationId, route, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was used with a different request.');
      if (existing.responseJson) return existing.responseJson as any;
      throw new AppError(409, 'IDEMPOTENCY_REQUEST_IN_PROGRESS', 'The same maintenance generation request is already processing.');
    }

    const current = await this.repository.getScheduleForGeneration(tenant.organizationId, tenant.branchId, scheduleId);
    if (!current) throw new AppError(404, 'MAINTENANCE_SCHEDULE_NOT_FOUND', 'Maintenance schedule not found.');
    if (!current.generatedWorkOrderId) {
      assertScheduleCanGenerateWorkOrder({ status: current.status, generatedWorkOrderId: current.generatedWorkOrderId, active: current.plan.active });
    }
    if (current.generatedWorkOrderId) {
      return {
        id: current.generatedWorkOrderId,
        workOrderNo: current.generatedWorkOrder?.workOrderNo ?? null,
        maintenanceScheduleId: current.id,
        maintenanceExecutionId: current.executions[0]?.id ?? null,
        status: 'EXISTING',
      };
    }

    const result = await this.fieldService.createMaintenanceWorkOrder({
      organizationId: tenant.organizationId,
      branchId: current.plan.branchId ?? tenant.branchId,
      assetId: current.plan.assetId,
      projectId: current.plan.asset.projectId ?? null,
      scheduledAt: current.dueAt,
      priority: 'MEDIUM',
      actorUserId: actor.userId,
      maintenanceScheduleId: scheduleId,
      afterCreate: async (tx, workOrder) => {
        const claim = await this.repository.claimIdempotency(tx, {
          organizationId: tenant.organizationId,
          route,
          key: idempotencyKey,
          requestHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        if (!claim.claimed) {
          if (claim.requestHash !== requestHash) throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was used with a different request.');
          if (claim.responseJson) return;
          throw new AppError(409, 'IDEMPOTENCY_REQUEST_IN_PROGRESS', 'The same maintenance generation request is already processing.');
        }

        const schedule = await this.repository.lockSchedule(tx, tenant.organizationId, tenant.branchId, scheduleId);
        if (!schedule) throw new AppError(404, 'MAINTENANCE_SCHEDULE_NOT_FOUND', 'Maintenance schedule not found.');
        assertScheduleCanGenerateWorkOrder({ status: schedule.status, generatedWorkOrderId: schedule.generatedWorkOrderId, active: schedule.active });
        assertOneGeneratedWorkOrderPerSchedule(schedule.generatedWorkOrderId);
        if (schedule.generatedWorkOrderId) {
          const response = { id: schedule.generatedWorkOrderId, status: 'EXISTING', maintenanceScheduleId: schedule.id };
          await this.repository.completeIdempotency(tx, tenant.organizationId, route, idempotencyKey, response);
          return;
        }

        const asset = await this.assets.assertAsset(tenant.organizationId, schedule.assetId);
        if (asset.status === 'RETIRED' || asset.status === 'REPLACED') {
          throw new AppError(409, 'MAINTENANCE_ASSET_TERMINAL', 'Terminal asset cannot generate a maintenance work order.');
        }
        const execution = await this.repository.createExecution(tx, { scheduleId: schedule.id, workOrderId: workOrder.id });
        await this.repository.setScheduleGenerated(tx, schedule.id, workOrder.id);
        await this.assets.markUnderMaintenance(tx, {
          organizationId: tenant.organizationId,
          assetId: schedule.assetId,
          workOrderId: workOrder.id,
          scheduleId: schedule.id,
        });
        if (schedule.dueAt.getTime() <= Date.now()) {
          await this.events.append(tx, {
            organizationId: tenant.organizationId,
            type: 'maintenance.due',
            aggregateType: 'MaintenanceSchedule',
            aggregateId: schedule.id,
            payload: { maintenancePlanId: schedule.maintenancePlanId, assetId: schedule.assetId, dueAt: schedule.dueAt.toISOString(), workOrderId: workOrder.id },
          });
        }
        const response = { id: workOrder.id, workOrderNo: workOrder.workOrderNo, maintenanceScheduleId: schedule.id, maintenanceExecutionId: execution.id, status: 'GENERATED' };
        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'MAINTENANCE_WORK_ORDER_GENERATED',
          subjectType: 'MaintenanceSchedule',
          subjectId: schedule.id,
          afterJson: response,
          ip: actor.ip,
        });
        await this.repository.completeIdempotency(tx, tenant.organizationId, route, idempotencyKey, response);
      },
    });
    const completed = await this.repository.findIdempotency(tenant.organizationId, route, idempotencyKey);
    return (completed?.responseJson as any) ?? result.target;
  }

  async completeExecution(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    executionId: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const execution = await this.repository.lockExecution(tx, tenant.organizationId, tenant.branchId, executionId);
      if (!execution) throw new AppError(404, 'MAINTENANCE_EXECUTION_NOT_FOUND', 'Maintenance execution not found.');
      const workOrder = await this.fieldService.assertWorkOrder(tenant.organizationId, execution.workOrderId);
      assertExecutionCompletionAllowed({ executionStatus: execution.status, workOrderStatus: workOrder.status });

      const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
      const nextDueAt = nextDueAtFromCycle(completedAt, execution.frequencyType, execution.intervalValue);
      assertNextSchedulePolicy({ planActive: execution.active, completedAt, nextDueAt });
      const consumed: Array<{ productId: string; qty: string; stockTransactionId: string | null }> = [];

      for (const part of input.parts) {
        assertMaintenancePartConsumptionPolicy({ qty: part.qty, batches: part.batches });
        await this.inventory.validateServicePartSource(tenant.organizationId, {
          warehouseId: part.sourceWarehouseId,
          locationId: part.sourceLocationId ?? null,
          productId: part.productId,
        });
        const ledger = await this.inventory.consumeMaintenancePart(tx, {
          organizationId: tenant.organizationId,
          warehouseId: part.sourceWarehouseId,
          locationId: part.sourceLocationId ?? null,
          productId: part.productId,
          qty: new Prisma.Decimal(part.qty),
          referenceId: execution.id,
          batches: part.batches.map((row: any) => ({ lotNo: row.lotNo, qty: new Prisma.Decimal(row.qty) })),
        });
        await this.repository.createPart(tx, {
          maintenanceExecutionId: execution.id,
          productId: part.productId,
          qty: new Prisma.Decimal(part.qty),
          sourceWarehouseId: part.sourceWarehouseId,
          sourceLocationId: part.sourceLocationId ?? null,
          batchAllocationsJson: part.batches,
          stockTransactionId: ledger.id,
        });
        consumed.push({ productId: part.productId, qty: part.qty, stockTransactionId: ledger.id });
      }

      await this.repository.completeExecution(tx, execution.id, {
        completedAt,
        result: input.result,
        nextDueAt,
        notes: input.notes ?? null,
      });
      await this.repository.completeSchedule(tx, execution.scheduleId);
      if (execution.active) {
        const next = await this.repository.createNextSchedule(tx, execution.maintenancePlanId, nextDueAt);
        if (nextDueAt.getTime() <= Date.now()) {
          await this.events.append(tx, {
            organizationId: tenant.organizationId,
            type: 'maintenance.due',
            aggregateType: 'MaintenanceSchedule',
            aggregateId: next.id,
            payload: { maintenancePlanId: execution.maintenancePlanId, assetId: execution.assetId, dueAt: nextDueAt.toISOString() },
          });
        }
      }

      await this.assets.recordMaintenanceCompletion(tx, {
        organizationId: tenant.organizationId,
        assetId: execution.assetId,
        maintenanceExecutionId: execution.id,
        workOrderId: execution.workOrderId,
        result: input.result,
        notes: input.notes ?? null,
        parts: consumed,
      });

      const warrantyRmaHandoff = createMaintenanceWarrantyRmaReviewDecision({
        result: input.result,
        maintenanceExecutionId: execution.id,
        assetId: execution.assetId,
        workOrderId: execution.workOrderId,
      });
      if (warrantyRmaHandoff.reviewRequired) {
        await this.events.append(tx, {
          organizationId: tenant.organizationId,
          type: 'maintenance.warranty_rma.review_required',
          aggregateType: 'MaintenanceExecution',
          aggregateId: execution.id,
          payload: warrantyRmaHandoff.payload,
        });
      }

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'MAINTENANCE_EXECUTION_COMPLETED',
        subjectType: 'MaintenanceExecution',
        subjectId: execution.id,
        beforeJson: { status: execution.status, scheduleStatus: execution.scheduleStatus },
        afterJson: { status: 'COMPLETED', result: input.result, completedAt, nextDueAt, parts: consumed, warrantyRmaReviewRequired: warrantyRmaHandoff.reviewRequired },
        ip: actor.ip,
      });

      return {
        id: execution.id,
        status: 'COMPLETED',
        result: input.result,
        completedAt: completedAt.toISOString(),
        nextDueAt: nextDueAt.toISOString(),
        parts: consumed,
      };
    });
  }
}
