import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

type Page = { skip: number; take: number };

export class ReportBuilderRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new ReportBuilderRepository(db); }

  listTemplates(organizationId: string, query: any, page: Page) {
    const where: any = {
      organizationId,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.dataSource ? { dataSource: query.dataSource } : {}),
    };
    return Promise.all([
      this.db.reportTemplate.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: page.skip, take: page.take }),
      this.db.reportTemplate.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  getTemplate(organizationId: string, id: string) { return this.db.reportTemplate.findFirst({ where: { organizationId, id } }); }
  createTemplate(tx: TransactionClient, data: any) { return tx.reportTemplate.create({ data }); }
  updateTemplate(tx: TransactionClient, organizationId: string, id: string, data: any) { return tx.reportTemplate.update({ where: { id }, data }); }

  listSavedReports(organizationId: string, ownerUserId: string, query: any, page: Page) {
    const where: any = {
      organizationId,
      ...(query.owner === 'me' ? { ownerUserId } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.dataSource ? { template: { dataSource: query.dataSource } } : {}),
    };
    return Promise.all([
      this.db.savedReport.findMany({ where, include: { template: true }, orderBy: { updatedAt: 'desc' }, skip: page.skip, take: page.take }),
      this.db.savedReport.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  getSavedReport(organizationId: string, id: string) { return this.db.savedReport.findFirst({ where: { organizationId, id }, include: { template: true } }); }
  createSavedReport(tx: TransactionClient, data: any) { return tx.savedReport.create({ data }); }
  updateSavedReport(tx: TransactionClient, organizationId: string, id: string, data: any) { return tx.savedReport.update({ where: { id }, data, include: { template: true } }); }

  listScheduledReports(organizationId: string, ownerUserId: string, query: any, page: Page) {
    const where: any = {
      organizationId,
      ...(query.owner === 'me' ? { createdById: ownerUserId } : {}),
      ...(query.status ? { active: query.status === 'ACTIVE' } : {}),
      ...(query.q ? { savedReport: { name: { contains: query.q, mode: 'insensitive' } } } : {}),
    };
    return Promise.all([
      this.db.scheduledReport.findMany({ where, include: { savedReport: true }, orderBy: { nextRunAt: 'asc' }, skip: page.skip, take: page.take }),
      this.db.scheduledReport.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  getScheduledReport(organizationId: string, id: string) { return this.db.scheduledReport.findFirst({ where: { organizationId, id }, include: { savedReport: { include: { template: true } } } }); }
  createScheduledReport(tx: TransactionClient, data: any) { return tx.scheduledReport.create({ data, include: { savedReport: true } }); }
  updateScheduledReport(tx: TransactionClient, organizationId: string, id: string, data: any) { return tx.scheduledReport.update({ where: { id }, data, include: { savedReport: true } }); }

  listReportExecutions(organizationId: string, ownerUserId: string, query: any, page: Page) {
    const where: any = {
      organizationId,
      ...(query.owner === 'me' ? { requestedById: ownerUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    return Promise.all([
      this.db.reportExecution.findMany({ where, include: { savedReport: true, scheduledReport: true }, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      this.db.reportExecution.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  createReportExecution(tx: TransactionClient, data: any) { return tx.reportExecution.create({ data }); }
  getReportExecution(organizationId: string, id: string) {
    return this.db.reportExecution.findFirst({
      where: { organizationId, id },
      include: { savedReport: true, scheduledReport: true },
    });
  }

  listDashboardWidgets(organizationId: string, userId: string, page: Page) {
    const where: any = { organizationId, OR: [{ userDashboardId: null }, { userDashboard: { userId } }] };
    return Promise.all([
      this.db.dashboardWidget.findMany({ where, include: { savedReport: true, userDashboard: true }, orderBy: { updatedAt: 'desc' }, skip: page.skip, take: page.take }),
      this.db.dashboardWidget.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  createDashboardWidget(tx: TransactionClient, data: any) { return tx.dashboardWidget.create({ data }); }

  listSavedViews(organizationId: string, userId: string, query: any, page: Page) {
    const where: any = {
      organizationId,
      userId,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    return Promise.all([
      this.db.savedView.findMany({ where, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }], skip: page.skip, take: page.take }),
      this.db.savedView.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }
  getSavedView(organizationId: string, userId: string, id: string) { return this.db.savedView.findFirst({ where: { organizationId, userId, id } }); }
  createSavedView(tx: TransactionClient, data: any) { return tx.savedView.create({ data }); }
  updateSavedView(tx: TransactionClient, organizationId: string, userId: string, id: string, data: any) { return tx.savedView.update({ where: { id }, data }); }
}
