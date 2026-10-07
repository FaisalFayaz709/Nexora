import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class OrganizationRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient): OrganizationRepository {
    return new OrganizationRepository(db);
  }

  addressBelongsToOrganization(organizationId: string, addressId: string): Promise<boolean> {
    return this.db.address
      .count({ where: { id: addressId, organizationId } })
      .then((count) => count === 1);
  }

  async listBranches(input: {
    organizationId: string;
    branchScopeId: string | null;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.branchScopeId ? { id: input.branchScopeId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.branch.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: input.skip,
        take: input.take,
        select: { id: true, code: true, name: true, addressId: true },
      }),
      this.db.branch.count({ where }),
    ]);

    return { rows, total };
  }

  getBranch(organizationId: string, branchScopeId: string | null, id: string) {
    return this.db.branch.findFirst({
      where: {
        id,
        organizationId,
        ...(branchScopeId ? { id: branchScopeId } : {}),
      },
      select: { id: true, code: true, name: true, addressId: true },
    });
  }

  createBranch(input: {
    organizationId: string;
    code: string;
    name: string;
    addressId: string | null;
  }) {
    return this.db.branch.create({
      data: input,
      select: { id: true, code: true, name: true, addressId: true },
    });
  }

  async updateBranch(
    organizationId: string,
    id: string,
    data: { code?: string; name?: string; addressId?: string | null },
  ) {
    const result = await this.db.branch.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count !== 1) return null;

    return this.db.branch.findFirst({
      where: { id, organizationId },
      select: { id: true, code: true, name: true, addressId: true, organizationId: true },
    });
  }

  async listDepartments(input: {
    organizationId: string;
    branchScopeId: string | null;
    branchId?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.branchScopeId
        ? { branchId: input.branchScopeId }
        : input.branchId
          ? { branchId: input.branchId }
          : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.department.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: input.skip,
        take: input.take,
        select: {
          id: true,
          branchId: true,
          name: true,
          managerEmployeeId: true,
        },
      }),
      this.db.department.count({ where }),
    ]);

    return { rows, total };
  }

  getDepartment(organizationId: string, branchScopeId: string | null, id: string) {
    return this.db.department.findFirst({
      where: {
        id,
        organizationId,
        ...(branchScopeId ? { branchId: branchScopeId } : {}),
      },
      select: {
        id: true,
        branchId: true,
        name: true,
        managerEmployeeId: true,
      },
    });
  }

  branchExists(organizationId: string, branchId: string): Promise<boolean> {
    return this.db.branch
      .count({ where: { id: branchId, organizationId } })
      .then((count) => count === 1);
  }

  createDepartment(input: {
    organizationId: string;
    branchId: string;
    name: string;
  }) {
    return this.db.department.create({
      data: input,
      select: {
        id: true,
        branchId: true,
        name: true,
        managerEmployeeId: true,
      },
    });
  }

  async updateDepartment(
    organizationId: string,
    id: string,
    data: { name?: string },
  ) {
    const result = await this.db.department.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count !== 1) return null;

    return this.db.department.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        name: true,
        managerEmployeeId: true,
      },
    });
  }
}
