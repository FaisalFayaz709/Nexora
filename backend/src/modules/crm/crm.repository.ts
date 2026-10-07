import { Prisma, prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;

type ModelKey = 'lead'|'opportunity'|'siteSurvey'|'quotation'|'customerContract';
const delegates: Record<ModelKey, string> = {
  lead: 'lead', opportunity: 'opportunity', siteSurvey: 'siteSurvey', quotation: 'quotation', customerContract: 'customerContract',
};

export class CrmRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new CrmRepository(db); }
  private d(model: ModelKey) { return (this.db as any)[delegates[model]]; }

  async list(model: ModelKey, organizationId: string, query: any, skip: number, take: number) {
    const where = { organizationId, ...(query.status ? { status: query.status } : {}), ...(query.customerId ? { customerId: query.customerId } : {}), ...(query.siteId ? { siteId: query.siteId } : {}) };
    const [rows, total] = await Promise.all([this.d(model).findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), this.d(model).count({ where })]);
    return { rows, total };
  }
  get(model: ModelKey, organizationId: string, id: string) { return this.d(model).findFirst({ where: { organizationId, id } }); }
  createLead(data: any) { return (this.db as any).lead.create({ data }); }
  updateLead(id: string, data: any) { return (this.db as any).lead.update({ where: { id }, data }); }
  createOpportunity(data: any) { return (this.db as any).opportunity.create({ data }); }
  updateOpportunity(id: string, data: any) { return (this.db as any).opportunity.update({ where: { id }, data }); }
  createSiteSurvey(data: any) { return (this.db as any).siteSurvey.create({ data }); }
  updateSiteSurvey(id: string, data: any) { return (this.db as any).siteSurvey.update({ where: { id }, data }); }
  createQuotation(data: any, items: any[]) { return (this.db as any).quotation.create({ data: { ...data, items: { create: items } }, include: { items: true } }); }
  updateQuotation(id: string, data: any) { return (this.db as any).quotation.update({ where: { id }, data }); }
  createContract(data: any, items: any[] = []) { return (this.db as any).customerContract.create({ data: { ...data, ...(items.length ? { items: { create: items } } : {}) }, include: { items: true } }); }
  updateContract(id: string, data: any) { return (this.db as any).customerContract.update({ where: { id }, data }); }
  async lockQuotation(db: TransactionClient, organizationId: string, id: string) {
    const rows = await db.$queryRaw<Array<any>>`SELECT * FROM "Quotation" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0] ?? null;
  }
  quotationItems(organizationId: string, quotationId: string) { return (this.db as any).quotationItem.findMany({ where: { organizationId, quotationId } }); }
  async lockContract(db: TransactionClient, organizationId: string, id: string) {
    const rows = await db.$queryRaw<Array<any>>`SELECT * FROM "CustomerContract" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0] ?? null;
  }
}
