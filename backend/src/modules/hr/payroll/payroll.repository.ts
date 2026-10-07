import { prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;
export class PayrollRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new PayrollRepository(db); }
  list(input: { organizationId: string; branchScopeId: string | null; branchId?: string; status?: string; from?: Date; to?: Date; skip: number; take: number }) { const where: any = { organizationId: input.organizationId }; if (input.branchScopeId) where.branchId = input.branchScopeId; else if (input.branchId) where.branchId = input.branchId; if (input.status) where.status = input.status; if (input.from || input.to) where.periodStart = { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) }; return Promise.all([this.db.payrollRun.findMany({ where, orderBy: [{ periodStart: 'desc' }, { id: 'desc' }], skip: input.skip, take: input.take, include: { items: true } }), this.db.payrollRun.count({ where })]).then(([rows, total]) => ({ rows, total })); }
  get(organizationId: string, branchScopeId: string | null, id: string) { return this.db.payrollRun.findFirst({ where: { id, organizationId, ...(branchScopeId ? { branchId: branchScopeId } : {}) }, include: { items: { include: { employee: { select: { id: true, employeeNo: true, name: true } } } } } }); }
  create(tx: TransactionClient, data: any) { return tx.payrollRun.create({ data, include: { items: true } }); }
  async lock(tx: TransactionClient, organizationId: string, id: string) { const rows = await tx.$queryRaw<Array<any>>`SELECT * FROM "PayrollRun" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`; return rows[0] ?? null; }
  update(tx: TransactionClient, id: string, data: any) { return tx.payrollRun.update({ where: { id }, data, include: { items: true } }); }
  replaceItems(tx: TransactionClient, payrollRunId: string, items: any[]) { return tx.payrollItem.deleteMany({ where: { payrollRunId } }).then(() => tx.payrollItem.createMany({ data: items })); }
  items(tx: TransactionClient, payrollRunId: string) { return tx.payrollItem.findMany({ where: { payrollRunId } }); }
  employees(input: { organizationId: string; branchScopeId: string | null; branchId: string | null; employeeIds?: string[] }) { return this.db.employee.findMany({ where: { organizationId: input.organizationId, status: 'ACTIVE', ...(input.branchScopeId ? { branchId: input.branchScopeId } : input.branchId ? { branchId: input.branchId } : {}), ...(input.employeeIds?.length ? { id: { in: input.employeeIds } } : {}) }, select: { id: true, branchId: true, baseSalary: true } }); }
  attendanceStats(organizationId: string, employeeId: string, from: Date, to: Date) { return this.db.attendance.groupBy({ by: ['status'], where: { organizationId, employeeId, workDate: { gte: from, lte: to } }, _count: { id: true }, _sum: { overtimeHours: true } }); }
  leaveStats(organizationId: string, employeeId: string, from: Date, to: Date) { return this.db.leaveRequest.aggregate({ where: { organizationId, employeeId, status: 'APPROVED', fromDate: { gte: from }, toDate: { lte: to } }, _sum: { days: true } }); }
}
