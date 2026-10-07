import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class ApprovalRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient): ApprovalRepository {
    return new ApprovalRepository(db);
  }

  listDefinitions(input: {
    organizationId: string;
    subjectType?: string;
    active?: boolean;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.subjectType ? { subjectType: input.subjectType } : {}),
      ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
    };
    return Promise.all([
      this.db.approvalDefinition.findMany({
        where,
        orderBy: [{ subjectType: 'asc' }, { name: 'asc' }],
        skip: input.skip,
        take: input.take,
        include: { steps: { orderBy: { sequence: 'asc' } } },
      }),
      this.db.approvalDefinition.count({ where }),
    ]);
  }

  activeDefinitions(organizationId: string, subjectType: string) {
    return this.db.approvalDefinition.findMany({
      where: { organizationId, subjectType, active: true },
      orderBy: { createdAt: 'asc' },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
  }

  createDefinition(tx: TransactionClient, data: {
    organizationId: string;
    subjectType: string;
    name: string;
    conditionJson: unknown;
    active: boolean;
    steps: Array<{
      sequence: number;
      approverType: string;
      approverRef: string;
      minApprovals: number;
    }>;
  }) {
    return tx.approvalDefinition.create({
      data: {
        organizationId: data.organizationId,
        subjectType: data.subjectType,
        name: data.name,
        conditionJson: data.conditionJson as never,
        active: data.active,
        steps: { create: data.steps },
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
  }

  createRequest(tx: TransactionClient, data: {
    organizationId: string;
    branchId: string | null;
    subjectType: string;
    subjectId: string;
    definitionId: string;
    requestedById: string;
    contextJson: unknown;
    steps: Array<{
      sequence: number;
      approverType: string;
      approverRef: string;
      minApprovals: number;
      status: string;
      activatedAt: Date | null;
    }>;
  }) {
    return tx.approvalRequest.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        definitionId: data.definitionId,
        requestedById: data.requestedById,
        contextJson: data.contextJson as never,
        status: 'IN_PROGRESS',
        steps: { create: data.steps },
      },
      include: {
        definition: true,
        steps: { orderBy: { sequence: 'asc' }, include: { actions: true } },
      },
    });
  }

  async lockRequest(
    tx: TransactionClient,
    organizationId: string,
    id: string,
  ) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      branchId: string | null;
      subjectType: string;
      subjectId: string;
      definitionId: string;
      status: string;
      requestedById: string;
    }>>`
      SELECT "id","organizationId","branchId","subjectType","subjectId",
             "definitionId","status","requestedById"
      FROM "ApprovalRequest"
      WHERE "id" = ${id}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  getRequest(
    organizationId: string,
    branchId: string | null,
    id: string,
  ) {
    return this.db.approvalRequest.findFirst({
      where: {
        id,
        organizationId,
        ...(branchId
          ? { OR: [{ branchId }, { branchId: null }] }
          : {}),
      },
      include: {
        definition: true,
        steps: {
          orderBy: { sequence: 'asc' },
          include: {
            actions: {
              orderBy: { actedAt: 'asc' },
              select: {
                id: true,
                actorId: true,
                action: true,
                comment: true,
                actedAt: true,
              },
            },
          },
        },
      },
    });
  }

  currentRequestBySubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ) {
    return this.db.approvalRequest.findFirst({
      where: {
        organizationId,
        subjectType,
        subjectId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }

  async lockPendingStep(tx: TransactionClient, approvalRequestId: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      approvalRequestId: string;
      sequence: number;
      approverType: string;
      approverRef: string;
      minApprovals: number;
      status: string;
    }>>`
      SELECT "id","approvalRequestId","sequence","approverType","approverRef",
             "minApprovals","status"
      FROM "ApprovalStep"
      WHERE "approvalRequestId" = ${approvalRequestId}::uuid
        AND "status" = 'PENDING'
      ORDER BY "sequence"
      LIMIT 1
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  actorAlreadyActed(tx: TransactionClient, stepId: string, actorId: string) {
    return tx.approvalAction.count({
      where: { approvalStepId: stepId, actorId },
    });
  }

  createAction(tx: TransactionClient, data: {
    approvalStepId: string;
    actorId: string;
    action: string;
    comment: string | null;
  }) {
    return tx.approvalAction.create({ data });
  }

  approvalCount(tx: TransactionClient, stepId: string) {
    return tx.approvalAction.count({
      where: { approvalStepId: stepId, action: 'APPROVE' },
    });
  }

  setStepStatus(
    tx: TransactionClient,
    id: string,
    status: string,
    completedAt: Date | null,
  ) {
    return tx.approvalStep.update({
      where: { id },
      data: { status, completedAt },
    });
  }

  nextWaitingStep(
    tx: TransactionClient,
    requestId: string,
    afterSequence: number,
  ) {
    return tx.approvalStep.findFirst({
      where: {
        approvalRequestId: requestId,
        sequence: { gt: afterSequence },
        status: 'WAITING',
      },
      orderBy: { sequence: 'asc' },
    });
  }

  activateStep(tx: TransactionClient, id: string) {
    return tx.approvalStep.update({
      where: { id },
      data: { status: 'PENDING', activatedAt: new Date() },
    });
  }

  setRequestStatus(
    tx: TransactionClient,
    id: string,
    status: string,
    completed: boolean,
  ) {
    return tx.approvalRequest.update({
      where: { id },
      data: {
        status,
        ...(completed ? { completedAt: new Date() } : {}),
      },
    });
  }

  listInbox(input: {
    organizationId: string;
    branchId: string | null;
    actorUserId: string;
    roleIds: string[];
    subjectType?: string;
    skip: number;
    take: number;
  }) {
    const eligibility = [
      { approverType: 'USER', approverRef: input.actorUserId },
      ...(input.roleIds.length
        ? [{ approverType: 'ROLE', approverRef: { in: input.roleIds } }]
        : []),
    ];

    const where = {
      status: 'PENDING',
      OR: eligibility,
      approvalRequest: {
        organizationId: input.organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        ...(input.subjectType ? { subjectType: input.subjectType } : {}),
        ...(input.branchId
          ? { OR: [{ branchId: input.branchId }, { branchId: null }] }
          : {}),
        requestedById: { not: input.actorUserId },
      },
      actions: {
        none: { actorId: input.actorUserId },
      },
    };

    return Promise.all([
      this.db.approvalStep.findMany({
        where,
        orderBy: [
          { approvalRequest: { createdAt: 'asc' } },
          { sequence: 'asc' },
        ],
        skip: input.skip,
        take: input.take,
        include: {
          approvalRequest: {
            include: { definition: true },
          },
          actions: true,
        },
      }),
      this.db.approvalStep.count({ where }),
    ]);
  }
  listWorkflowRules(input: {
    organizationId: string;
    triggerType?: string;
    subjectType?: string;
    active?: boolean;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.triggerType ? { triggerType: input.triggerType } : {}),
      ...(input.subjectType ? { subjectType: input.subjectType } : {}),
      ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
    };
    const db = this.db as any;
    return Promise.all([
      db.businessRule.findMany({ where, orderBy: [{ triggerType: 'asc' }, { name: 'asc' }], skip: input.skip, take: input.take }),
      db.businessRule.count({ where }),
    ]);
  }

  getWorkflowRule(organizationId: string, id: string) {
    const db = this.db as any;
    return db.businessRule.findFirst({ where: { id, organizationId } });
  }

  activeWorkflowRules(organizationId: string, triggerType: string, subjectType?: string) {
    const db = this.db as any;
    return db.businessRule.findMany({
      where: {
        organizationId,
        triggerType,
        active: true,
        ...(subjectType ? { subjectType } : {}),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    });
  }

  createWorkflowRule(tx: TransactionClient, data: {
    organizationId: string;
    branchId: string | null;
    triggerType: string;
    subjectType: string;
    name: string;
    description?: string | null;
    severity: string;
    conditionJson: unknown;
    actionsJson: unknown;
    active: boolean;
    createdById: string;
  }) {
    const db = tx as any;
    return db.businessRule.create({ data: data as never });
  }

  updateWorkflowRule(tx: TransactionClient, organizationId: string, id: string, data: Record<string, unknown>) {
    const db = tx as any;
    return db.businessRule.update({ where: { id }, data: data as never });
  }

  setWorkflowRuleActive(tx: TransactionClient, organizationId: string, id: string, active: boolean) {
    const db = tx as any;
    return db.businessRule.update({ where: { id }, data: { active } });
  }

}
