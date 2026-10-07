import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;
type PortalType = 'CUSTOMER' | 'VENDOR' | 'TECHNICIAN';

const PAGE_SIZE_MAX = 100;
function paging(query: { page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(Math.max(1, Number(query.pageSize ?? 25)), PAGE_SIZE_MAX);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export class PortalWorkspaceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new PortalWorkspaceRepository(db); }

  async portalAccount(organizationId: string, userId: string, portalType: PortalType) {
    return (this.db as any).portalAccount.findFirst({
      where: { organizationId, userId, portalType, status: 'ACTIVE' },
    });
  }

  async appendActivity(db: TransactionClient, input: { organizationId: string; portalAccountId?: string | null; action: string; subjectType?: string | null; subjectId?: string | null; ip?: string | null }) {
    return (db as any).portalActivityLog.create({ data: input });
  }

  async customerCounts(organizationId: string, customerId: string) {
    const db = this.db as any;
    const [projects, contracts, sites, assets, tickets, invoices, payments, documents] = await Promise.all([
      db.project.count({ where: { organizationId, customerId } }),
      db.contract.count({ where: { organizationId, customerId } }),
      db.customerSite.count({ where: { organizationId, customerId } }),
      db.asset.count({ where: { organizationId, customerId } }),
      db.ticket.count({ where: { organizationId, customerId } }),
      db.customerInvoice.count({ where: { organizationId, customerId } }),
      db.payment.count({ where: { organizationId, partyType: 'CUSTOMER', partyId: customerId } }),
      db.documentLink.count({ where: { document: { organizationId }, OR: [{ subjectType: 'CUSTOMER', subjectId: customerId }, { subjectType: 'CUSTOMER_PORTAL', subjectId: customerId }] } }),
    ]);
    return { projects, contracts, sites, assets, tickets, invoices, payments, documents };
  }

  async vendorCounts(organizationId: string, vendorId: string) {
    const db = this.db as any;
    const [rfqs, quotations, purchaseOrders, deliveries, invoices, payments, documents] = await Promise.all([
      db.rFQVendor.count({ where: { vendorId, rfq: { organizationId } } }),
      db.supplierQuotation.count({ where: { organizationId, vendorId } }),
      db.purchaseOrder.count({ where: { organizationId, vendorId } }),
      db.goodsReceipt.count({ where: { organizationId, purchaseOrder: { vendorId } } }),
      db.supplierInvoice.count({ where: { organizationId, vendorId } }),
      db.payment.count({ where: { organizationId, partyType: 'VENDOR', partyId: vendorId } }),
      db.documentLink.count({ where: { document: { organizationId }, OR: [{ subjectType: 'VENDOR', subjectId: vendorId }, { subjectType: 'VENDOR_PORTAL', subjectId: vendorId }] } }),
    ]);
    return { rfqs, quotations, purchaseOrders, deliveries, invoices, payments, documents };
  }

  async technicianCounts(organizationId: string, technicianEmployeeId: string) {
    const db = this.db as any;
    const [jobs, openJobs, offlineItems] = await Promise.all([
      db.workOrder.count({ where: { organizationId, assignments: { some: { technicianId: technicianEmployeeId } } } }),
      db.workOrder.count({ where: { organizationId, status: { notIn: ['CLOSED', 'CANCELLED'] }, assignments: { some: { technicianId: technicianEmployeeId } } } }),
      db.offlinePwaSyncItem.count({ where: { organizationId, status: 'PENDING' } }),
    ]);
    return { jobs, openJobs, offlineItems };
  }

  async customerResources(kind: string, organizationId: string, customerId: string, query: any) {
    const db = this.db as any;
    const p = paging(query);
    const whereByKind: Record<string, { model: string; where: Record<string, unknown>; orderBy?: Record<string, string> }> = {
      projects: { model: 'project', where: { organizationId, customerId }, orderBy: { updatedAt: 'desc' } },
      contracts: { model: 'contract', where: { organizationId, customerId }, orderBy: { updatedAt: 'desc' } },
      sites: { model: 'customerSite', where: { organizationId, customerId }, orderBy: { name: 'asc' } },
      assets: { model: 'asset', where: { organizationId, customerId }, orderBy: { createdAt: 'desc' } },
      tickets: { model: 'ticket', where: { organizationId, customerId }, orderBy: { createdAt: 'desc' } },
      invoices: { model: 'customerInvoice', where: { organizationId, customerId }, orderBy: { issueDate: 'desc' } },
      payments: { model: 'payment', where: { organizationId, partyType: 'CUSTOMER', partyId: customerId }, orderBy: { paidAt: 'desc' } },
      documents: { model: 'documentLink', where: { document: { organizationId }, OR: [{ subjectType: 'CUSTOMER', subjectId: customerId }, { subjectType: 'CUSTOMER_PORTAL', subjectId: customerId }] }, orderBy: { createdAt: 'desc' } },
    };
    const config = whereByKind[kind];
    const delegate = db[config.model];
    const [rows, total] = await Promise.all([
      delegate.findMany({ where: config.where, orderBy: config.orderBy, skip: p.skip, take: p.take }),
      delegate.count({ where: config.where }),
    ]);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async vendorResources(kind: string, organizationId: string, vendorId: string, query: any) {
    const db = this.db as any;
    const p = paging(query);
    const whereByKind: Record<string, { model: string; where: Record<string, unknown>; orderBy?: Record<string, string> }> = {
      rfqs: { model: 'rFQVendor', where: { vendorId, rfq: { organizationId } }, orderBy: { invitedAt: 'desc' } },
      quotations: { model: 'supplierQuotation', where: { organizationId, vendorId }, orderBy: { createdAt: 'desc' } },
      'purchase-orders': { model: 'purchaseOrder', where: { organizationId, vendorId }, orderBy: { orderDate: 'desc' } },
      deliveries: { model: 'goodsReceipt', where: { organizationId, purchaseOrder: { vendorId } }, orderBy: { receivedAt: 'desc' } },
      invoices: { model: 'supplierInvoice', where: { organizationId, vendorId }, orderBy: { createdAt: 'desc' } },
      payments: { model: 'payment', where: { organizationId, partyType: 'VENDOR', partyId: vendorId }, orderBy: { paidAt: 'desc' } },
      documents: { model: 'documentLink', where: { document: { organizationId }, OR: [{ subjectType: 'VENDOR', subjectId: vendorId }, { subjectType: 'VENDOR_PORTAL', subjectId: vendorId }] }, orderBy: { createdAt: 'desc' } },
      performance: { model: 'vendorPerformance', where: { vendorId }, orderBy: { period: 'desc' } },
    };
    const config = whereByKind[kind];
    const delegate = db[config.model];
    const [rows, total] = await Promise.all([
      delegate.findMany({ where: config.where, orderBy: config.orderBy, skip: p.skip, take: p.take }),
      delegate.count({ where: config.where }),
    ]);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async technicianJobs(organizationId: string, technicianEmployeeId: string, query: any) {
    const p = paging(query);
    const where = { organizationId, assignments: { some: { technicianId: technicianEmployeeId } } };
    const db = this.db as any;
    const [rows, total] = await Promise.all([
      db.workOrder.findMany({ where, orderBy: { scheduledAt: 'asc' }, skip: p.skip, take: p.take }),
      db.workOrder.count({ where }),
    ]);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async technicianWorkOrder(organizationId: string, technicianEmployeeId: string, id: string) {
    return (this.db as any).workOrder.findFirst({
      where: { id, organizationId, assignments: { some: { technicianId: technicianEmployeeId } } },
    });
  }

  async offlineQueue(organizationId: string, technicianUserId: string, query: any) {
    const p = paging(query);
    const db = this.db as any;
    const where = { organizationId, batch: { technicianUserId } };
    const [rows, total] = await Promise.all([
      db.offlinePwaSyncItem.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      db.offlinePwaSyncItem.count({ where }),
    ]);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }
}
