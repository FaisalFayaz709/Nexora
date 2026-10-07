import { Prisma, prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;
export class LeaveRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new LeaveRepository(db); }
  list(input: { organizationId: string; branchScopeId: string | null; employeeId?: string; leaveTypeId?: string; status?: string; from?: Date; to?: Date; skip: number; take: number }) {
    const where: any = { organizationId: input.organizationId };
    if (input.employeeId) where.employeeId = input.employeeId;
    if (input.leaveTypeId) where.leaveTypeId = input.leaveTypeId;
    if (input.status) where.status = input.status;
    if (input.from || input.to) where.fromDate = { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) };
    if (input.branchScopeId) where.employee = { branchId: input.branchScopeId };
    return Promise.all([
      this.db.leaveRequest.findMany({ where, orderBy: [{ fromDate: 'desc' }, { id: 'desc' }], skip: input.skip, take: input.take, include: { employee: { select: { id: true, employeeNo: true, name: true, branchId: true } }, leaveType: true } }),
      this.db.leaveRequest.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  get(organizationId: string, branchScopeId: string | null, id: string) { return this.db.leaveRequest.findFirst({ where: { id, organizationId, ...(branchScopeId ? { employee: { branchId: branchScopeId } } : {}) }, include: { employee: { select: { id: true, employeeNo: true, name: true, branchId: true, userId: true } }, leaveType: true } }); }
  getEmployee(organizationId: string, branchScopeId: string | null, employeeId: string) { return this.db.employee.findFirst({ where: { id: employeeId, organizationId, ...(branchScopeId ? { branchId: branchScopeId } : {}) }, select: { id: true, branchId: true, userId: true, status: true } }); }
  getLeaveType(organizationId: string, leaveTypeId: string) { return this.db.leaveType.findFirst({ where: { id: leaveTypeId, organizationId, active: true } }); }
  create(tx: TransactionClient, data: any) { return tx.leaveRequest.create({ data, include: { employee: true, leaveType: true } }); }
  async lock(tx: TransactionClient, organizationId: string, id: string) { const rows = await tx.$queryRaw<Array<any>>`SELECT * FROM "LeaveRequest" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`; return rows[0] ?? null; }
  update(tx: TransactionClient, id: string, data: any) { return tx.leaveRequest.update({ where: { id }, data, include: { employee: true, leaveType: true } }); }
  async lockBalance(tx: TransactionClient, organizationId: string, employeeId: string, leaveTypeId: string, year: number, opening: Prisma.Decimal) {
    const upserted = await tx.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } }, update: {}, create: { organizationId, employeeId, leaveTypeId, year, opening, remaining: opening, used: new Prisma.Decimal(0) } });
    const rows = await tx.$queryRaw<Array<any>>`SELECT * FROM "LeaveBalance" WHERE "id"=${upserted.id}::uuid FOR UPDATE`;
    return rows[0] ?? upserted;
  }
  updateBalance(tx: TransactionClient, id: string, used: Prisma.Decimal, remaining: Prisma.Decimal) { return tx.leaveBalance.update({ where: { id }, data: { used, remaining } }); }
}
