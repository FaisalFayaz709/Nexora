import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class ProjectRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient) {
    return new ProjectRepository(db);
  }

  async list(input: {
    organizationId: string;
    status?: string;
    customerId?: string;
    managerId?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.managerId ? { managerId: input.managerId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.project.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
        select: {
          id: true,
          projectNo: true,
          name: true,
          customerId: true,
          siteId: true,
          managerId: true,
          status: true,
          startDate: true,
          dueDate: true,
          contractValue: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.db.project.count({ where }),
    ]);
    return { rows, total };
  }

  get(organizationId: string, id: string) {
    return this.db.project.findFirst({
      where: { id, organizationId },
      include: {
        phases: { orderBy: { sequence: 'asc' } },
        milestones: { orderBy: [{ dueDate: 'asc' }, { id: 'asc' }] },
        members: true,
        risks: { orderBy: { createdAt: 'desc' } },
        issues: { orderBy: { createdAt: 'desc' } },
        handovers: { orderBy: { acceptedAt: 'desc' }, take: 1 },
      },
    });
  }

  async lockProject(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      customerId: string;
      siteId: string;
      managerId: string;
      projectNo: string;
      status: string;
      contractValue: Prisma.Decimal;
      startDate: Date;
      dueDate: Date;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT "id","organizationId","customerId","siteId","managerId","projectNo",
             "status","contractValue","startDate","dueDate","createdAt","updatedAt"
      FROM "Project"
      WHERE "id" = ${id}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  create(tx: TransactionClient, data: {
    organizationId: string;
    customerId: string;
    contractId: string;
    siteId: string;
    projectNo: string;
    name: string;
    managerId: string;
    startDate: Date;
    dueDate: Date;
    contractValue: Prisma.Decimal;
  }) {
    return tx.project.create({
      data: {
        ...data,
        status: 'DRAFT',
        phases: {
          create: {
            name: 'Execution',
            sequence: 1,
            status: 'NOT_STARTED',
          },
        },
        budgets: {
          create: {
            version: 1,
            status: 'DRAFT',
            totalBudget: new Prisma.Decimal(0),
          },
        },
      },
    });
  }

  update(id: string, data: Record<string, unknown>) {
    return this.db.project.update({ where: { id }, data });
  }

  async updateTenantScoped(organizationId: string, id: string, data: Record<string, unknown>) {
    await this.db.project.updateMany({ where: { id, organizationId }, data });
    return this.db.project.findFirstOrThrow({ where: { id, organizationId } });
  }

  async deliveryReadiness(organizationId: string, projectId: string) {
    const [openTaskCount, pendingMilestoneCount, approvedBomCount] = await Promise.all([
      this.db.projectTask.count({
        where: {
          projectId,
          project: { organizationId },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      this.db.projectMilestone.count({
        where: {
          projectId,
          project: { organizationId },
          status: { notIn: ['ACHIEVED', 'CANCELLED'] },
        },
      }),
      this.db.billOfMaterials.count({
        where: {
          projectId,
          project: { organizationId },
          status: 'APPROVED',
        },
      }),
    ]);
    return { openTaskCount, pendingMilestoneCount, approvedBomCount };
  }

  listTasks(input: {
    organizationId: string;
    projectId?: string;
    assigneeId?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      project: { organizationId: input.organizationId },
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    return Promise.all([
      this.db.projectTask.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: input.skip,
        take: input.take,
        include: {
          dependencies: true,
        },
      }),
      this.db.projectTask.count({ where }),
    ]);
  }

  getTask(organizationId: string, id: string) {
    return this.db.projectTask.findFirst({
      where: { id, project: { organizationId } },
      include: {
        dependencies: true,
        dependents: true,
      },
    });
  }

  phaseBelongsToProject(projectId: string, phaseId: string) {
    return this.db.projectPhase.count({ where: { id: phaseId, projectId } }).then((count) => count === 1);
  }

  taskBelongsToProject(projectId: string, taskId: string) {
    return this.db.projectTask.count({ where: { id: taskId, projectId } }).then((count) => count === 1);
  }

  createTask(tx: TransactionClient, data: {
    projectId: string;
    phaseId: string | null;
    assigneeId: string | null;
    title: string;
    status: string;
    priority: string;
    startDate: Date | null;
    dueDate: Date | null;
    completionPct: number;
    dependencyTaskIds: string[];
  }) {
    return tx.projectTask.create({
      data: {
        projectId: data.projectId,
        phaseId: data.phaseId,
        assigneeId: data.assigneeId,
        title: data.title,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate,
        dueDate: data.dueDate,
        completionPct: data.completionPct,
        dependencies: data.dependencyTaskIds.length
          ? {
              create: data.dependencyTaskIds.map((dependsOnTaskId) => ({
                dependsOnTaskId,
                type: 'FINISH_TO_START',
              })),
            }
          : undefined,
      },
      include: { dependencies: true },
    });
  }

  updateTask(tx: TransactionClient, id: string, data: Record<string, unknown>, dependencyTaskIds?: string[]) {
    return tx.projectTask.update({
      where: { id },
      data: {
        ...data,
        ...(dependencyTaskIds
          ? {
              dependencies: {
                deleteMany: {},
                create: dependencyTaskIds.map((dependsOnTaskId) => ({
                  dependsOnTaskId,
                  type: 'FINISH_TO_START',
                })),
              },
            }
          : {}),
      },
      include: { dependencies: true },
    });
  }

  latestBom(projectId: string) {
    return this.db.billOfMaterials.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { items: true },
    });
  }

  getBom(projectId: string, bomId: string) {
    return this.db.billOfMaterials.findFirst({
      where: { id: bomId, projectId },
      include: { items: true },
    });
  }

  async upsertDraftBom(
    tx: TransactionClient,
    projectId: string,
    items: Array<{ productId: string; requiredQty: Prisma.Decimal }>,
  ) {
    const latest = await tx.billOfMaterials.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { items: true },
    });

    if (latest?.status === 'DRAFT') {
      return tx.billOfMaterials.update({
        where: { id: latest.id },
        data: {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              productId: item.productId,
              requiredQty: item.requiredQty,
              reservedQty: 0,
              issuedQty: 0,
            })),
          },
        },
        include: { items: true },
      });
    }

    const version = (latest?.version ?? 0) + 1;
    return tx.billOfMaterials.create({
      data: {
        projectId,
        version,
        status: 'DRAFT',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            requiredQty: item.requiredQty,
            reservedQty: 0,
            issuedQty: 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  approveBom(tx: TransactionClient, bomId: string) {
    return tx.billOfMaterials.update({
      where: { id: bomId },
      data: { status: 'APPROVED' },
      include: { items: true },
    });
  }

  supersedeOtherApprovedBoms(tx: TransactionClient, projectId: string, exceptId: string) {
    return tx.billOfMaterials.updateMany({
      where: {
        projectId,
        id: { not: exceptId },
        status: 'APPROVED',
      },
      data: { status: 'SUPERSEDED' },
    });
  }

  latestBudget(projectId: string) {
    return this.db.projectBudget.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { lines: true },
    });
  }

  getBudget(projectId: string, budgetId: string) {
    return this.db.projectBudget.findFirst({
      where: { id: budgetId, projectId },
      include: { lines: true },
    });
  }

  async upsertDraftBudget(
    tx: TransactionClient,
    projectId: string,
    totalBudget: Prisma.Decimal,
    lines: Array<{ category: string; budgetAmount: Prisma.Decimal }>,
  ) {
    const latest = await tx.projectBudget.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { lines: true },
    });

    if (latest?.status === 'DRAFT') {
      return tx.projectBudget.update({
        where: { id: latest.id },
        data: {
          totalBudget,
          lines: {
            deleteMany: {},
            create: lines.map((line) => ({
              category: line.category,
              budgetAmount: line.budgetAmount,
              committedAmount: new Prisma.Decimal(0),
              actualAmount: new Prisma.Decimal(0),
            })),
          },
        },
        include: { lines: true },
      });
    }

    const version = (latest?.version ?? 0) + 1;
    return tx.projectBudget.create({
      data: {
        projectId,
        version,
        status: 'DRAFT',
        totalBudget,
        lines: {
          create: lines.map((line) => ({
            category: line.category,
            budgetAmount: line.budgetAmount,
            committedAmount: new Prisma.Decimal(0),
            actualAmount: new Prisma.Decimal(0),
          })),
        },
      },
      include: { lines: true },
    });
  }

  approveBudget(tx: TransactionClient, budgetId: string) {
    return tx.projectBudget.update({
      where: { id: budgetId },
      data: { status: 'APPROVED' },
      include: { lines: true },
    });
  }

  supersedeOtherApprovedBudgets(tx: TransactionClient, projectId: string, exceptId: string) {
    return tx.projectBudget.updateMany({
      where: {
        projectId,
        id: { not: exceptId },
        status: 'APPROVED',
      },
      data: { status: 'SUPERSEDED' },
    });
  }

  createHandover(tx: TransactionClient, data: {
    projectId: string;
    acceptedByCustomerId: string;
    acceptedAt: Date;
    documentId: string | null;
  }) {
    return tx.projectHandover.create({
      data: {
        ...data,
        status: 'COMPLETED',
      },
    });
  }

  // C6 ProjectMilestone / ProjectBudget / ProjectBudgetLine read-model continuity stays repository-owned.
  localTimeline(projectId: string) {
    return Promise.all([
      this.db.project.findUnique({
        where: { id: projectId },
        select: { id: true, projectNo: true, createdAt: true, updatedAt: true, status: true },
      }),
      this.db.projectTask.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.db.projectMilestone.findMany({
        where: { projectId },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, status: true, dueDate: true, achievedAt: true, createdAt: true, updatedAt: true },
      }),
      this.db.billOfMaterials.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, version: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.db.projectBudget.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, version: true, status: true, totalBudget: true, createdAt: true, updatedAt: true },
      }),
      this.db.projectHandover.findMany({
        where: { projectId },
        orderBy: { acceptedAt: 'asc' },
        select: { id: true, status: true, acceptedAt: true },
      }),
    ]);
  }
}
