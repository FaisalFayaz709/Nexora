import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class MaintenanceRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient) {
    return new MaintenanceRepository(db);
  }

  async listPlans(input: {
    organizationId: string;
    branchId: string | null;
    assetId?: string;
    active?: boolean;
    frequencyType?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.assetId ? { assetId: input.assetId } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.frequencyType ? { frequencyType: input.frequencyType } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.maintenancePlan.findMany({
        where,
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
        skip: input.skip,
        take: input.take,
        include: {
          asset: { select: { id: true, assetNo: true, status: true, siteId: true, projectId: true } },
          checklist: { include: { items: { orderBy: { sequence: 'asc' } } } },
          schedules: { orderBy: { dueAt: 'asc' }, take: 1 },
        },
      }),
      this.db.maintenancePlan.count({ where }),
    ]);
    return { rows, total };
  }

  createChecklist(
    tx: TransactionClient,
    data: {
      organizationId: string;
      name: string;
      version: number;
      items: Array<{ sequence: number; label: string; required: boolean }>;
    },
  ) {
    return tx.maintenanceChecklist.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        version: data.version,
        active: true,
        items: { create: data.items },
      },
      include: { items: true },
    });
  }

  getChecklist(organizationId: string, id: string) {
    return this.db.maintenanceChecklist.findFirst({
      where: { id, organizationId, active: true },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
  }

  createPlan(
    tx: TransactionClient,
    data: {
      organizationId: string;
      branchId: string | null;
      assetId: string;
      contractId: string | null;
      checklistId: string | null;
      name: string;
      frequencyType: string;
      intervalValue: number;
      active: boolean;
      firstDueAt: Date;
    },
  ) {
    return tx.maintenancePlan.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId,
        assetId: data.assetId,
        contractId: data.contractId,
        checklistId: data.checklistId,
        name: data.name,
        frequencyType: data.frequencyType,
        intervalValue: data.intervalValue,
        active: data.active,
        schedules: {
          create: {
            dueAt: data.firstDueAt,
            status: data.firstDueAt.getTime() <= Date.now() ? 'DUE' : 'SCHEDULED',
          },
        },
      },
      include: { schedules: { orderBy: { dueAt: 'asc' } }, checklist: true },
    });
  }

  async listSchedules(input: {
    organizationId: string;
    branchId: string | null;
    from?: Date;
    to?: Date;
    siteId?: string;
    assetId?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      ...(input.from || input.to
        ? { dueAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      plan: {
        organizationId: input.organizationId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.assetId ? { assetId: input.assetId } : {}),
        ...(input.siteId ? { asset: { siteId: input.siteId } } : {}),
      },
    };
    const [rows, total] = await Promise.all([
      this.db.maintenanceSchedule.findMany({
        where,
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
        skip: input.skip,
        take: input.take,
        include: {
          plan: {
            include: {
              asset: { select: { id: true, assetNo: true, status: true, siteId: true, projectId: true } },
              checklist: { include: { items: { orderBy: { sequence: 'asc' } } } },
            },
          },
          generatedWorkOrder: { select: { id: true, workOrderNo: true, status: true } },
        },
      }),
      this.db.maintenanceSchedule.count({ where }),
    ]);
    return { rows, total };
  }


  async getScheduleForGeneration(organizationId: string, branchId: string | null, id: string) {
    return this.db.maintenanceSchedule.findFirst({
      where: {
        id,
        plan: { organizationId, ...(branchId ? { branchId } : {}) },
      },
      include: { plan: { include: { asset: true } }, generatedWorkOrder: true, executions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async lockSchedule(tx: TransactionClient, organizationId: string, branchId: string | null, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      maintenancePlanId: string;
      dueAt: Date;
      status: string;
      generatedWorkOrderId: string | null;
      organizationId: string;
      branchId: string | null;
      assetId: string;
      contractId: string | null;
      frequencyType: string;
      intervalValue: number;
      active: boolean;
    }>>`
      SELECT s."id", s."maintenancePlanId", s."dueAt", s."status", s."generatedWorkOrderId",
             p."organizationId", p."branchId", p."assetId", p."contractId", p."frequencyType", p."intervalValue", p."active"
      FROM "MaintenanceSchedule" s
      JOIN "MaintenancePlan" p ON p."id" = s."maintenancePlanId"
      WHERE s."id" = ${id}::uuid
        AND p."organizationId" = ${organizationId}::uuid
        AND (${branchId}::uuid IS NULL OR p."branchId" = ${branchId}::uuid)
      FOR UPDATE OF s, p
    `;
    return rows[0] ?? null;
  }

  createExecution(tx: TransactionClient, data: { scheduleId: string; workOrderId: string }) {
    return tx.maintenanceExecution.create({
      data: { scheduleId: data.scheduleId, workOrderId: data.workOrderId, status: 'IN_PROGRESS' },
    });
  }

  setScheduleGenerated(tx: TransactionClient, scheduleId: string, workOrderId: string) {
    return tx.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { status: 'GENERATED', generatedWorkOrderId: workOrderId },
    });
  }

  async lockExecution(tx: TransactionClient, organizationId: string, branchId: string | null, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      scheduleId: string;
      workOrderId: string;
      status: string;
      completedAt: Date | null;
      result: string | null;
      nextDueAt: Date | null;
      notes: string | null;
      maintenancePlanId: string;
      dueAt: Date;
      scheduleStatus: string;
      generatedWorkOrderId: string | null;
      organizationId: string;
      branchId: string | null;
      assetId: string;
      frequencyType: string;
      intervalValue: number;
      active: boolean;
    }>>`
      SELECT e."id", e."scheduleId", e."workOrderId", e."status", e."completedAt", e."result", e."nextDueAt", e."notes",
             s."maintenancePlanId", s."dueAt", s."status" as "scheduleStatus", s."generatedWorkOrderId",
             p."organizationId", p."branchId", p."assetId", p."frequencyType", p."intervalValue", p."active"
      FROM "MaintenanceExecution" e
      JOIN "MaintenanceSchedule" s ON s."id" = e."scheduleId"
      JOIN "MaintenancePlan" p ON p."id" = s."maintenancePlanId"
      WHERE e."id" = ${id}::uuid
        AND p."organizationId" = ${organizationId}::uuid
        AND (${branchId}::uuid IS NULL OR p."branchId" = ${branchId}::uuid)
      FOR UPDATE OF e, s, p
    `;
    return rows[0] ?? null;
  }

  completeExecution(
    tx: TransactionClient,
    id: string,
    data: { completedAt: Date; result: string; nextDueAt: Date; notes: string | null },
  ) {
    return tx.maintenanceExecution.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: data.completedAt, result: data.result, nextDueAt: data.nextDueAt, notes: data.notes },
    });
  }

  completeSchedule(tx: TransactionClient, id: string) {
    return tx.maintenanceSchedule.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  createNextSchedule(tx: TransactionClient, maintenancePlanId: string, dueAt: Date) {
    return tx.maintenanceSchedule.create({
      data: { maintenancePlanId, dueAt, status: dueAt.getTime() <= Date.now() ? 'DUE' : 'SCHEDULED' },
    });
  }

  createPart(
    tx: TransactionClient,
    data: {
      maintenanceExecutionId: string;
      productId: string;
      qty: Prisma.Decimal;
      sourceWarehouseId: string;
      sourceLocationId: string | null;
      batchAllocationsJson: unknown;
      stockTransactionId: string;
    },
  ) {
    return tx.maintenancePart.create({ data: { ...data, batchAllocationsJson: data.batchAllocationsJson as never } });
  }

  findIdempotency(organizationId: string, route: string, key: string) {
    return this.db.idempotencyKey.findUnique({
      where: { organizationId_route_key: { organizationId, route, key } },
      select: { requestHash: true, responseJson: true },
    });
  }

  async claimIdempotency(
    tx: TransactionClient,
    input: { organizationId: string; route: string; key: string; requestHash: string; expiresAt: Date },
  ) {
    const inserted = await tx.$executeRaw`
      INSERT INTO "IdempotencyKey" ("organizationId","route","key","requestHash","expiresAt")
      VALUES (${input.organizationId}::uuid, ${input.route}, ${input.key}, ${input.requestHash}, ${input.expiresAt})
      ON CONFLICT ("organizationId","route","key") DO NOTHING
    `;
    const existing = await tx.idempotencyKey.findUnique({
      where: { organizationId_route_key: { organizationId: input.organizationId, route: input.route, key: input.key } },
      select: { requestHash: true, responseJson: true },
    });
    return { claimed: inserted === 1, requestHash: existing?.requestHash ?? input.requestHash, responseJson: existing?.responseJson ?? null };
  }

  completeIdempotency(tx: TransactionClient, organizationId: string, route: string, key: string, responseJson: unknown) {
    return tx.idempotencyKey.update({
      where: { organizationId_route_key: { organizationId, route, key } },
      data: { responseJson: responseJson as never },
    });
  }
}
