import { Prisma, prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;
function page(query:{page?:number;pageSize?:number}){const current=Math.max(1,Number(query.page??1)); const pageSize=Math.min(Math.max(1,Number(query.pageSize??25)),100); return {page:current,pageSize,skip:(current-1)*pageSize,take:pageSize};}
export class SaaSRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new SaaSRepository(db); }
  listPlans(query:any={}) { const p=page(query); return Promise.all([(this.db as any).saaSPlan.findMany({ where: { ...(query.includeInactive?{}:{active:true}) }, orderBy: { name: 'asc' }, skip:p.skip, take:p.take }), (this.db as any).saaSPlan.count({ where: { ...(query.includeInactive?{}:{active:true}) } })]).then(([rows,total])=>({rows,total,page:p.page,pageSize:p.pageSize})); }
  getPlan(id: string) { return (this.db as any).saaSPlan.findFirst({ where: { id } }); }
  getActivePlan(id: string) { return (this.db as any).saaSPlan.findFirst({ where: { id, active: true } }); }
  createPlan(tx: TransactionClient, data: any) { return (tx as any).saaSPlan.create({ data }); }
  updatePlan(tx: TransactionClient, id: string, data: any) { return (tx as any).saaSPlan.update({ where: { id }, data }); }
  subscriptions(query:any={}) { const p=page(query); const where={ ...(query.organizationId?{organizationId:query.organizationId}:{}), ...(query.status?{status:query.status}:{}) }; return Promise.all([(this.db as any).saaSSubscription.findMany({ where, include:{plan:true}, orderBy:{startsAt:'desc'}, skip:p.skip, take:p.take }), (this.db as any).saaSSubscription.count({ where })]).then(([rows,total])=>({rows,total,page:p.page,pageSize:p.pageSize})); }
  getSubscription(id:string){ return (this.db as any).saaSSubscription.findFirst({ where:{id}, include:{plan:true} }); }
  createSubscription(tx: TransactionClient, data: any) { return (tx as any).saaSSubscription.create({ data }); }
  updateSubscription(tx: TransactionClient, id: string, data: any) { return (tx as any).saaSSubscription.update({ where: { id }, data }); }
  createSubscriptionFeatures(tx: TransactionClient, data: any[]) { return data.length ? (tx as any).saaSSubscriptionFeature.createMany({ data, skipDuplicates:true }) : Promise.resolve({ count: 0 }); }
  usageMetrics(organizationId: string | undefined, from: Date | null, to: Date | null, skip: number, take: number) { const where: any = { ...(organizationId ? { organizationId } : {}), ...(from || to ? { measuredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }; return Promise.all([ (this.db as any).tenantUsageMetric.findMany({ where, orderBy: { measuredAt: 'desc' }, skip, take }), (this.db as any).tenantUsageMetric.count({ where }), ]).then(([rows,total]) => ({ rows,total })); }
  getUsage(id: string) { return (this.db as any).tenantUsageMetric.findFirst({ where: { id } }); }
  createUsage(tx: TransactionClient, rows: any[], storage: any) { return Promise.all([ (tx as any).tenantUsageMetric.createMany({ data: rows }), (tx as any).tenantStorageUsage.create({ data: storage }) ]); }
  invoices(query:any={}) { const p=page(query); const where={ ...(query.organizationId?{organizationId:query.organizationId}:{}), ...(query.subscriptionId?{subscriptionId:query.subscriptionId}:{}), ...(query.status?{status:query.status}:{}) }; return Promise.all([(this.db as any).saaSInvoice.findMany({ where, orderBy:{createdAt:'desc'}, skip:p.skip, take:p.take }), (this.db as any).saaSInvoice.count({ where })]).then(([rows,total])=>({rows,total,page:p.page,pageSize:p.pageSize})); }
  getInvoice(id: string) { return (this.db as any).saaSInvoice.findFirst({ where: { id } }); }
  createInvoice(tx: TransactionClient, data:any) { return (tx as any).saaSInvoice.create({ data }); }
  updateInvoice(tx: TransactionClient, id:string, data:any) { return (tx as any).saaSInvoice.update({ where:{id}, data }); }
  postInvoice(tx: TransactionClient, id: string, amount: Prisma.Decimal, dueDate: Date, memo: string | null) { return (tx as any).saaSInvoice.update({ where: { id }, data: { amount, dueDate, memo, status: 'POSTED', postedAt: new Date() } }); }
}
