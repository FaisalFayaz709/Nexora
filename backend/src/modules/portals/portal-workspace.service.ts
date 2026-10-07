import { withTransaction } from '@nexora/database';
import {
  CustomerPortalConfirmWorkOrderSchema,
  CustomerPortalCreateTicketSchema,
  PortalDashboardQuerySchema,
  PortalResourceListQuerySchema,
  TechnicianPortalCommandSchema,
  VendorPortalAcknowledgePurchaseOrderSchema,
  VendorPortalSubmitInvoiceSchema,
  VendorPortalSubmitQuotationSchema,
} from '@nexora/shared';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import {
  assertCustomerPortalScope,
  assertPwaEvidenceUsesDocumentStorage,
  assertTechnicianWorkOrderScope,
  assertVendorPortalScope,
  type PortalActorContext,
} from './portal-access-policy.js';
import { PortalWorkspaceRepository } from './portal-workspace.repository.js';

type TenantAuth = { organizationId: string; userId: string; ip?: string | null };
type PortalKind = 'CUSTOMER' | 'VENDOR' | 'TECHNICIAN';

export class PortalWorkspaceService {
  constructor(
    private readonly repository = new PortalWorkspaceRepository(),
    private readonly audit = new AuditWriter(),
  ) {}

  private async actor(auth: TenantAuth, portalType: PortalKind): Promise<PortalActorContext & { portalAccountId: string }> {
    const account = await this.repository.portalAccount(auth.organizationId, auth.userId, portalType);
    if (!account) throw new AppError(403, 'PORTAL_ACCOUNT_NOT_LINKED', 'Authenticated user is not linked to this portal surface.');
    return {
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorType: portalType,
      customerId: portalType === 'CUSTOMER' ? account.linkedSubjectId : null,
      vendorId: portalType === 'VENDOR' ? account.linkedSubjectId : null,
      technicianEmployeeId: portalType === 'TECHNICIAN' ? account.linkedSubjectId : null,
      branchId: null,
      permissions: [],
      portalAccountId: account.id,
    };
  }

  async customerDashboard(auth: TenantAuth, rawQuery: unknown) {
    PortalDashboardQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'CUSTOMER');
    assertCustomerPortalScope(actor, { organizationId: auth.organizationId, customerId: actor.customerId });
    return { linkedCustomerId: actor.customerId, counts: await this.repository.customerCounts(auth.organizationId, actor.customerId!) };
  }

  async customerResource(kind: string, auth: TenantAuth, rawQuery: unknown) {
    const query = PortalResourceListQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'CUSTOMER');
    assertCustomerPortalScope(actor, { organizationId: auth.organizationId, customerId: actor.customerId });
    return this.repository.customerResources(kind, auth.organizationId, actor.customerId!, query);
  }

  async createCustomerTicket(auth: TenantAuth, rawBody: unknown) {
    const input = CustomerPortalCreateTicketSchema.parse(rawBody);
    const actor = await this.actor(auth, 'CUSTOMER');
    assertCustomerPortalScope(actor, { organizationId: auth.organizationId, customerId: actor.customerId });
    assertPwaEvidenceUsesDocumentStorage({ photoDocumentIds: input.documentIds });
    return withTransaction(async (tx) => {
      const ticket = await (tx as any).ticket.create({ data: { organizationId: auth.organizationId, customerId: actor.customerId, siteId: input.siteId ?? null, assetId: input.assetId ?? null, category: input.category, priority: input.priority, subject: input.subject, description: input.description, openedById: auth.userId, status: 'OPEN' } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: 'CUSTOMER_PORTAL_TICKET_CREATED', subjectType: 'Ticket', subjectId: ticket.id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: 'CUSTOMER_PORTAL_TICKET_CREATED', subjectType: 'Ticket', subjectId: ticket.id, afterJson: { customerId: actor.customerId, priority: input.priority }, ip: auth.ip ?? null });
      return ticket;
    });
  }

  async confirmCustomerWorkOrder(auth: TenantAuth, id: string, rawBody: unknown) {
    const input = CustomerPortalConfirmWorkOrderSchema.parse(rawBody);
    const actor = await this.actor(auth, 'CUSTOMER');
    assertCustomerPortalScope(actor, { organizationId: auth.organizationId, customerId: actor.customerId });
    return withTransaction(async (tx) => {
      const workOrder = await (tx as any).workOrder.update({ where: { id }, data: { status: input.confirmed ? 'CLOSED' : 'CUSTOMER_CONFIRMATION', customerConfirmationNote: input.comment ?? null } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: 'CUSTOMER_PORTAL_WORK_ORDER_CONFIRMED', subjectType: 'WorkOrder', subjectId: id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: 'CUSTOMER_PORTAL_WORK_ORDER_CONFIRMED', subjectType: 'WorkOrder', subjectId: id, afterJson: { confirmed: input.confirmed }, ip: auth.ip ?? null });
      return workOrder;
    });
  }

  async vendorDashboard(auth: TenantAuth, rawQuery: unknown) {
    PortalDashboardQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'VENDOR');
    assertVendorPortalScope(actor, { organizationId: auth.organizationId, vendorId: actor.vendorId });
    return { linkedVendorId: actor.vendorId, counts: await this.repository.vendorCounts(auth.organizationId, actor.vendorId!) };
  }

  async vendorResource(kind: string, auth: TenantAuth, rawQuery: unknown) {
    const query = PortalResourceListQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'VENDOR');
    assertVendorPortalScope(actor, { organizationId: auth.organizationId, vendorId: actor.vendorId });
    return this.repository.vendorResources(kind, auth.organizationId, actor.vendorId!, query);
  }

  async submitVendorQuotation(auth: TenantAuth, rawBody: unknown) {
    const input = VendorPortalSubmitQuotationSchema.parse(rawBody);
    const actor = await this.actor(auth, 'VENDOR');
    assertVendorPortalScope(actor, { organizationId: auth.organizationId, vendorId: actor.vendorId });
    return withTransaction(async (tx) => {
      const quotation = await (tx as any).supplierQuotation.create({ data: { organizationId: auth.organizationId, rfqId: input.rfqId, vendorId: actor.vendorId, quoteRef: input.quoteRef, validity: new Date(`${input.validity}T00:00:00.000Z`), total: input.total, status: 'SUBMITTED', items: { create: input.items.map((item) => ({ productId: item.productId, qty: item.quantity, unitPrice: item.unitPrice, deliveryDays: item.deliveryDays, warrantyMonths: item.warrantyMonths })) } } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: 'VENDOR_PORTAL_QUOTATION_SUBMITTED', subjectType: 'SupplierQuotation', subjectId: quotation.id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: 'VENDOR_PORTAL_QUOTATION_SUBMITTED', subjectType: 'SupplierQuotation', subjectId: quotation.id, afterJson: { vendorId: actor.vendorId, rfqId: input.rfqId }, ip: auth.ip ?? null });
      return quotation;
    });
  }

  async acknowledgePurchaseOrder(auth: TenantAuth, id: string, rawBody: unknown) {
    const input = VendorPortalAcknowledgePurchaseOrderSchema.parse(rawBody);
    const actor = await this.actor(auth, 'VENDOR');
    assertVendorPortalScope(actor, { organizationId: auth.organizationId, vendorId: actor.vendorId });
    return withTransaction(async (tx) => {
      const po = await (tx as any).purchaseOrder.update({ where: { id }, data: { vendorAcknowledgedAt: input.acknowledged ? new Date() : null, vendorNote: input.note ?? null } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: 'VENDOR_PORTAL_PO_ACKNOWLEDGED', subjectType: 'PurchaseOrder', subjectId: id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: 'VENDOR_PORTAL_PO_ACKNOWLEDGED', subjectType: 'PurchaseOrder', subjectId: id, afterJson: { acknowledged: input.acknowledged }, ip: auth.ip ?? null });
      return po;
    });
  }

  async submitVendorInvoice(auth: TenantAuth, rawBody: unknown) {
    const input = VendorPortalSubmitInvoiceSchema.parse(rawBody);
    const actor = await this.actor(auth, 'VENDOR');
    assertVendorPortalScope(actor, { organizationId: auth.organizationId, vendorId: actor.vendorId });
    return withTransaction(async (tx) => {
      const invoice = await (tx as any).supplierInvoice.create({ data: { organizationId: auth.organizationId, vendorId: actor.vendorId, purchaseOrderId: input.purchaseOrderId, goodsReceiptId: input.goodsReceiptId ?? null, invoiceNo: input.invoiceNo, status: 'DRAFT', total: input.total, items: { create: input.items.map((item) => ({ poItemId: item.poItemId ?? null, description: item.description, qty: item.quantity, unitPrice: item.unitPrice, lineTotal: item.unitPrice })) } } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: 'VENDOR_PORTAL_INVOICE_SUBMITTED', subjectType: 'SupplierInvoice', subjectId: invoice.id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: 'VENDOR_PORTAL_INVOICE_SUBMITTED', subjectType: 'SupplierInvoice', subjectId: invoice.id, afterJson: { vendorId: actor.vendorId, purchaseOrderId: input.purchaseOrderId }, ip: auth.ip ?? null });
      return invoice;
    });
  }

  async technicianDashboard(auth: TenantAuth, rawQuery: unknown) {
    PortalDashboardQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'TECHNICIAN');
    return { linkedTechnicianEmployeeId: actor.technicianEmployeeId, counts: await this.repository.technicianCounts(auth.organizationId, actor.technicianEmployeeId!) };
  }

  async technicianJobs(auth: TenantAuth, rawQuery: unknown) {
    const query = PortalResourceListQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'TECHNICIAN');
    return this.repository.technicianJobs(auth.organizationId, actor.technicianEmployeeId!, query);
  }

  async technicianWorkOrder(auth: TenantAuth, id: string) {
    const actor = await this.actor(auth, 'TECHNICIAN');
    const workOrder = await this.repository.technicianWorkOrder(auth.organizationId, actor.technicianEmployeeId!, id);
    if (!workOrder) throw new AppError(404, 'PORTAL_WORK_ORDER_NOT_FOUND', 'Assigned work order not found for this technician.');
    assertTechnicianWorkOrderScope(actor, { organizationId: auth.organizationId, assignedTechnicianId: actor.technicianEmployeeId, branchId: workOrder.branchId ?? null });
    return workOrder;
  }

  async technicianCommand(auth: TenantAuth, id: string, action: string, rawBody: unknown) {
    const input = TechnicianPortalCommandSchema.parse(rawBody ?? {});
    const actor = await this.actor(auth, 'TECHNICIAN');
    const workOrder = await this.repository.technicianWorkOrder(auth.organizationId, actor.technicianEmployeeId!, id);
    if (!workOrder) throw new AppError(404, 'PORTAL_WORK_ORDER_NOT_FOUND', 'Assigned work order not found for this technician.');
    assertTechnicianWorkOrderScope(actor, { organizationId: auth.organizationId, assignedTechnicianId: actor.technicianEmployeeId, branchId: workOrder.branchId ?? null });
    assertPwaEvidenceUsesDocumentStorage({ photoDocumentIds: input.photoDocumentId ? [input.photoDocumentId] : [], signatureDocumentIds: input.customerSignDocumentId ? [input.customerSignDocumentId] : [] });
    return withTransaction(async (tx) => {
      const updated = await (tx as any).workOrder.update({ where: { id }, data: { lastTechnicianAction: action, lastTechnicianActionAt: input.occurredAt ? new Date(input.occurredAt) : new Date() } });
      await this.repository.appendActivity(tx, { organizationId: auth.organizationId, portalAccountId: actor.portalAccountId, action: `TECHNICIAN_PORTAL_${action}`, subjectType: 'WorkOrder', subjectId: id, ip: auth.ip ?? null });
      await this.audit.append(tx, { organizationId: auth.organizationId, actorUserId: auth.userId, action: `TECHNICIAN_PORTAL_${action}`, subjectType: 'WorkOrder', subjectId: id, afterJson: { action }, ip: auth.ip ?? null });
      return updated;
    });
  }

  async offlineQueue(auth: TenantAuth, rawQuery: unknown) {
    const query = PortalResourceListQuerySchema.parse(rawQuery ?? {});
    const actor = await this.actor(auth, 'TECHNICIAN');
    return this.repository.offlineQueue(auth.organizationId, auth.userId, query);
  }
}
