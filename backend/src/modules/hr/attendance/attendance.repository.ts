import { prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;
export class AttendanceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new AttendanceRepository(db); }
  list(input: { organizationId: string; branchScopeId: string | null; employeeId?: string; branchId?: string; status?: string; from?: Date; to?: Date; skip: number; take: number }) {
    const where: any = { organizationId: input.organizationId };
    if (input.branchScopeId) where.branchId = input.branchScopeId; else if (input.branchId) where.branchId = input.branchId;
    if (input.employeeId) where.employeeId = input.employeeId;
    if (input.status) where.status = input.status;
    if (input.from || input.to) where.workDate = { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) };
    return Promise.all([
      this.db.attendance.findMany({ where, orderBy: [{ workDate: 'desc' }, { id: 'desc' }], skip: input.skip, take: input.take, include: { employee: { select: { id: true, employeeNo: true, name: true } } } }),
      this.db.attendance.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  get(organizationId: string, branchScopeId: string | null, id: string) {
    return this.db.attendance.findFirst({ where: { id, organizationId, ...(branchScopeId ? { branchId: branchScopeId } : {}) }, include: { employee: { select: { id: true, employeeNo: true, name: true } } } });
  }
}
