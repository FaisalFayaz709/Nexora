import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../common';

export const C14_CUSTOMER_VENDOR_TECHNICIAN_PORTALS = 'C14_CUSTOMER_VENDOR_TECHNICIAN_PORTALS' as const;

export const PortalWorkspaceControlIds = [
  'C14-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE',
  'C14-VENDOR-PORTAL-LINKED-VENDOR-SCOPE',
  'C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE',
  'C14-PORTAL-TOKEN-NEVER-BYPASSES-AUTHORIZATION',
  'C14-QR-ASSET-RESOLUTION-AUTHORIZED',
  'C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED',
  'C14-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE',
  'C14-PORTAL-ACTIONS-AUDITED',
  'C14-PORTAL-PERMISSION-FILTERED-DOCUMENTS-INVOICES-PAYMENTS',
  'C14-NO-CROSS-TENANT-PORTAL-DATA',
] as const;

export type PortalWorkspaceControlId = (typeof PortalWorkspaceControlIds)[number];

export const PortalActorTypeSchema = z.enum(['CUSTOMER', 'VENDOR', 'TECHNICIAN', 'INTERNAL']);
export type PortalActorType = z.infer<typeof PortalActorTypeSchema>;

export const PortalSurfaceSchema = z.enum([
  'CUSTOMER_PROJECTS',
  'CUSTOMER_CONTRACTS',
  'CUSTOMER_SITES',
  'CUSTOMER_ASSETS',
  'CUSTOMER_TICKETS',
  'CUSTOMER_WORK_ORDERS',
  'CUSTOMER_INVOICES',
  'CUSTOMER_PAYMENTS',
  'CUSTOMER_WARRANTIES',
  'CUSTOMER_DOCUMENTS',
  'VENDOR_RFQS',
  'VENDOR_QUOTATIONS',
  'VENDOR_PURCHASE_ORDERS',
  'VENDOR_DELIVERIES',
  'VENDOR_GOODS_RECEIVED',
  'VENDOR_INVOICES',
  'VENDOR_PAYMENTS',
  'VENDOR_DOCUMENTS',
  'TECHNICIAN_MY_JOBS',
  'TECHNICIAN_QR_SCAN',
  'TECHNICIAN_CUSTOMER_DETAILS',
  'TECHNICIAN_NAVIGATION',
  'TECHNICIAN_PHOTOS',
  'TECHNICIAN_SPARE_PARTS',
  'TECHNICIAN_STATUS_UPDATES',
  'TECHNICIAN_CUSTOMER_SIGNATURE',
  'TECHNICIAN_SERVICE_REPORT',
  'TECHNICIAN_OFFLINE_QUEUE',
]);
export type PortalSurface = z.infer<typeof PortalSurfaceSchema>;

export const PortalWorkspaceRequestSchema = z.object({
  actorType: PortalActorTypeSchema,
  surface: PortalSurfaceSchema,
  customerId: UuidSchema.optional(),
  vendorId: UuidSchema.optional(),
  technicianEmployeeId: UuidSchema.optional(),
  branchId: UuidSchema.optional(),
});

export const CustomerWorkApprovalSchema = z.object({
  workOrderId: UuidSchema,
  customerId: UuidSchema,
  approved: z.boolean(),
  comment: z.string().max(1000).optional(),
  signatureDocumentId: UuidSchema.optional(),
});

export const VendorQuotationSubmissionSchema = z.object({
  rfqId: UuidSchema,
  vendorId: UuidSchema,
  quoteRef: z.string().min(1).max(80),
  validity: z.string().datetime().optional(),
  lines: z.array(z.object({
    productId: UuidSchema,
    quantity: z.string().min(1).max(40),
    unitPrice: z.string().min(1).max(40),
    deliveryDays: z.number().int().min(0).max(3650).optional(),
    warrantyMonths: z.number().int().min(0).max(240).optional(),
  })).min(1).max(500),
});

export const TechnicianOfflineCommandTypeSchema = z.enum([
  'ACCEPT',
  'START_TRAVEL',
  'ARRIVE',
  'STATUS_CHANGE',
  'CHECKLIST_UPDATE',
  'CHECK_IN',
  'LOCATION',
  'START_WORK',
  'ADD_PHOTO',
  'USE_PART',
  'SIGNATURE',
  'SERVICE_REPORT',
  'CHECK_OUT',
  'COMPLETE',
]);
export type TechnicianOfflineCommandType = z.infer<typeof TechnicianOfflineCommandTypeSchema>;

export const TechnicianOfflineCommandSchema = z.object({
  clientCommandId: z.string().min(8).max(120),
  workOrderId: UuidSchema,
  /**
   * The authenticated technician employee is resolved server-side. A client may
   * include this field as a consistency check, but it is never trusted as
   * authorization context.
   */
  technicianEmployeeId: UuidSchema.optional(),
  type: TechnicianOfflineCommandTypeSchema.optional(),
  action: TechnicianOfflineCommandTypeSchema.optional(),
  occurredAt: IsoDateTimeSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, ctx) => {
  if (!value.type && !value.action) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Offline command requires type or legacy action.',
    });
  }
});
export type TechnicianOfflineCommandInput = z.infer<typeof TechnicianOfflineCommandSchema>;

export const TechnicianOfflineSyncBatchSchema = z.object({
  clientBatchId: z.string().min(8).max(160),
  deviceId: z.string().min(3).max(120),
  tenantClockAt: IsoDateTimeSchema,
  commands: z.array(TechnicianOfflineCommandSchema).min(1).max(200),
});
export type TechnicianOfflineSyncBatchInput = z.infer<typeof TechnicianOfflineSyncBatchSchema>;

export const TechnicianOfflineSyncResponseSchema = z.object({
  clientBatchId: z.string().min(8).max(160),
  accepted: z.array(z.string()),
  replayed: z.array(z.string()),
  rejected: z.array(z.object({
    clientCommandId: z.string().min(8).max(120),
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  })),
});
export type TechnicianOfflineSyncResponse = z.infer<typeof TechnicianOfflineSyncResponseSchema>;

export const PortalDocumentLinkRequestSchema = z.object({
  subjectType: z.enum(['CUSTOMER', 'VENDOR', 'PROJECT', 'ASSET', 'TICKET', 'WORK_ORDER', 'INVOICE', 'PAYMENT']),
  subjectId: UuidSchema,
  documentId: UuidSchema,
  category: z.string().min(1).max(120),
});

export const PortalWorkspaceManifest = {
  pass: 'C14',
  name: 'Customer Portal, Vendor Portal and Technician PWA',
  controls: PortalWorkspaceControlIds,
  customerPortal: ['Dashboard', 'My Projects', 'My Contracts', 'My Sites', 'My Assets', 'My Tickets', 'My Work Orders', 'My Maintenance Schedule', 'My Invoices', 'My Payments', 'My Warranties', 'My Documents', 'Approve Completed Work'],
  vendorPortal: ['Vendor Dashboard', 'New RFQs', 'Submitted Quotations', 'Purchase Orders', 'Delivery Schedule', 'Goods Received', 'Rejected Items', 'Invoices', 'Payments', 'Performance', 'Documents'],
  technicianPwa: ['My Jobs', 'Scan Asset QR', 'Customer Details', 'Navigation', 'Add Photos', 'Use Spare Part', 'Update Status', 'Customer Signature', 'Service Report', 'Offline Queue'],
  authorizationBoundary: 'Portal identity must resolve authenticated tenant membership plus a linked customer, linked vendor or assigned technician employee. QR or portal token never bypasses authorization.',
  documentBoundary: 'Photos, signatures and portal attachments use the centralized Document/StorageService path and remain private-by-default.',
  offlineBoundary: 'Offline commands are tenant scoped, assigned-technician scoped and idempotent by clientCommandId before replay.',
} as const;
