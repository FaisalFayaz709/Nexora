import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;
export class ReportingRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new ReportingRepository(db); }

  listReports(organizationId: string, ownerUserId: string, query: any, skip: number, take: number) {
    const savedWhere: any = { organizationId, ...(query.owner === 'me' ? { ownerUserId } : {}), ...(query.dataSource ? { template: { dataSource: query.dataSource } } : {}) };
    return Promise.all([
      this.db.savedReport.findMany({ where: savedWhere, include: { template: true }, orderBy: { updatedAt: 'desc' }, skip, take }),
      this.db.savedReport.count({ where: savedWhere }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  getReport(organizationId: string, id: string) {
    return this.db.savedReport.findFirst({ where: { organizationId, id }, include: { template: true, schedules: true } });
  }
  createExecution(tx: TransactionClient, data: any) { return tx.reportExecution.create({ data }); }
  getExecution(organizationId: string, id: string) {
    return this.db.reportExecution.findFirst({ where: { organizationId, id }, include: { savedReport: true, scheduledReport: true } });
  }
}
