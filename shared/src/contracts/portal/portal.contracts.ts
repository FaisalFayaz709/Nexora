import { z } from 'zod';
import { DecimalStringSchema, IsoDateSchema, IsoDateTimeSchema, PageQuerySchema, UuidSchema } from '../common';

export const PortalAccessGrantScopeSchema = z.enum(['CUSTOMER','VENDOR','TECHNICIAN']);
export const PortalActorTypeSchema = z.enum(['CUSTOMER', 'VENDOR', 'TECHNICIAN']);
export const PortalResourceTypeSchema = z.enum([
  'DASHBOARD', 'PROJECT', 'CONTRACT', 'SITE', 'ASSET', 'TICKET', 'INVOICE', 'PAYMENT', 'DOCUMENT',
  'RFQ', 'SUPPLIER_QUOTATION', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'VENDOR_PERFORMANCE', 'WORK_ORDER', 'OFFLINE_QUEUE',
]);

export const PortalResourceListQuerySchema = PageQuerySchema.extend({
  status: z.string().max(80).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  q: z.string().max(160).optional(),
});

export const PortalDashboardQuerySchema = z.object({
  includeCounts: z.coerce.boolean().default(true),
});

export const CustomerPortalCreateTicketSchema = z.object({
  siteId: UuidSchema.optional(),
  assetId: UuidSchema.optional(),
  category: z.string().min(2).max(80),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  subject: z.string().min(3).max(240),
  description: z.string().min(3).max(4000),
  documentIds: z.array(UuidSchema).default([]),
});

export const CustomerPortalConfirmWorkOrderSchema = z.object({
  confirmed: z.boolean().default(true),
  comment: z.string().max(1000).optional(),
  customerSignDocumentId: UuidSchema.optional(),
});

export const VendorPortalSubmitQuotationSchema = z.object({
  rfqId: UuidSchema,
  quoteRef: z.string().min(1).max(120),
  validity: IsoDateSchema,
  total: DecimalStringSchema,
  items: z.array(z.object({
    productId: UuidSchema,
    quantity: DecimalStringSchema,
    unitPrice: DecimalStringSchema,
    deliveryDays: z.number().int().min(0).max(3650),
    warrantyMonths: z.number().int().min(0).max(240),
  })).min(1),
});

export const VendorPortalAcknowledgePurchaseOrderSchema = z.object({
  acknowledged: z.boolean().default(true),
  promisedDeliveryDate: IsoDateSchema.optional(),
  note: z.string().max(1000).optional(),
});

export const VendorPortalSubmitInvoiceSchema = z.object({
  purchaseOrderId: UuidSchema,
  goodsReceiptId: UuidSchema.optional(),
  invoiceNo: z.string().min(1).max(120),
  invoiceDate: IsoDateSchema,
  total: DecimalStringSchema,
  documentId: UuidSchema.optional(),
  items: z.array(z.object({
    poItemId: UuidSchema.optional(),
    description: z.string().min(1).max(300),
    quantity: DecimalStringSchema,
    unitPrice: DecimalStringSchema,
  })).min(1),
});

export const TechnicianPortalCommandSchema = z.object({
  note: z.string().max(1000).optional(),
  occurredAt: IsoDateTimeSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photoDocumentId: UuidSchema.optional(),
  customerSignDocumentId: UuidSchema.optional(),
});

export const OfflinePwaSyncPolicySchema = z.object({
  organizationId: UuidSchema,
  offlineEnabled: z.boolean(),
  maxOfflineHours: z.number().int().min(0).max(168),
  photoRequired: z.boolean().default(false),
  signatureRequired: z.boolean().default(false),
});

export const PortalWorkspaceContract = {
  customerSurfaces: ['dashboard','projects','contracts','sites','assets','tickets','invoices','payments','documents'],
  vendorSurfaces: ['dashboard','rfqs','quotations','purchase-orders','deliveries','invoices','payments','performance','documents'],
  technicianSurfaces: ['dashboard','jobs','work-orders','offline-queue','offline-sync'],
  isolationRule: 'Portal identities are linked to one customer, vendor or assigned technician scope; tenant scope comes from authenticated membership and never from request bodies.',
  shellRule: 'Customer/vendor portals render inside PortalShell; technician workflows render inside TechnicianPwaShell and never show internal ERP navigation.',
  documentRule: 'Portal documents use Fastify authorization and short-lived document URLs; MinIO credentials are never exposed to portal frontend code.',
} as const;
