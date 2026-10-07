import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../common';

export const MISSING_PASS_M17_SOURCE_PREFLIGHT_PORTALS_PWA_OFFLINE_COMPLETION =
  'MISSING_PASS_M17_SOURCE_PREFLIGHT_PORTALS_PWA_OFFLINE_COMPLETION' as const;

export const PortalPwaOfflineCompletionSubjects = [
  'CUSTOMER_PORTAL_LINKED_CUSTOMER_SURFACES',
  'CUSTOMER_PORTAL_WORK_APPROVAL_SIGNATURE_DOCUMENT',
  'VENDOR_PORTAL_LINKED_VENDOR_RFQ_PO_INVOICE_SCOPE',
  'VENDOR_PORTAL_QUOTATION_SUBMISSION_GUARD',
  'TECHNICIAN_PWA_ASSIGNED_JOB_SCOPE',
  'TECHNICIAN_PWA_ONLINE_COMMAND_STATE_MACHINE',
  'TECHNICIAN_PWA_QR_SCAN_AUTHORIZATION',
  'TECHNICIAN_PWA_DOCUMENT_BACKED_EVIDENCE',
  'OFFLINE_SYNC_TENANT_DEVICE_TECHNICIAN_SCOPE',
  'OFFLINE_SYNC_CLIENT_COMMAND_IDEMPOTENCY',
  'OFFLINE_SYNC_ORDERING_AND_CONFLICT_POLICY',
  'PORTAL_ACTIVITY_AUDIT_TRAIL',
  'PORTAL_DOCUMENT_INVOICE_PAYMENT_SCOPE',
  'NO_ASYNC_CRITICAL_MUTATION',
] as const;

export type PortalPwaOfflineCompletionSubject = (typeof PortalPwaOfflineCompletionSubjects)[number];

export const PortalPwaOfflineCompletionRoutes = [
  'GET /api/v1/portal/customer/dashboard',
  'GET /api/v1/portal/customer/projects',
  'GET /api/v1/portal/customer/assets',
  'GET /api/v1/portal/customer/invoices',
  'POST /api/v1/portal/customer/work-orders/:id/approve',
  'GET /api/v1/portal/vendor/rfqs',
  'POST /api/v1/portal/vendor/rfqs/:id/quotations',
  'GET /api/v1/portal/vendor/purchase-orders',
  'GET /api/v1/portal/vendor/invoices',
  'GET /api/v1/portal/technician/jobs',
  'POST /api/v1/portal/technician/work-orders/:id/command',
  'POST /api/v1/portal/technician/work-orders/:id/evidence',
  'POST /api/v1/portal/technician/offline-sync',
] as const;

export const PortalPwaOfflineCompletionInvariants = [
  'Customer portal users are constrained to their linked customerId for projects, sites, assets, tickets, work orders, invoices, payments, warranties and documents.',
  'Vendor portal users are constrained to their linked vendorId for RFQs, quotations, POs, delivery, GRNs, supplier invoices, payments, performance and documents.',
  'Technician PWA users are constrained to assigned work orders and branch scope before every status, evidence, stock-part or service-report command.',
  'QR scan and portal token resolution provide context only; they never bypass authenticated authorization and linked-resource checks.',
  'PWA photos, signatures and attachments are Document IDs created through StorageService, never raw base64 blobs inside command payloads.',
  'Offline sync commands are tenant, device and technician scoped, ordered by occurredAt and idempotent by clientCommandId plus payload hash.',
  'Offline replay calls the same transactional command services used by online flows; queues may deliver notifications only after committed state.',
  'Portal activity logs and audit logs are written for every external portal mutation.',
] as const;

export const PortalPwaOfflineRuntimeScenarioIdSchema = z.enum([
  'M17-RUNTIME-CUSTOMER-PORTAL-LINKED-CUSTOMER-ONLY',
  'M17-RUNTIME-CUSTOMER-WORK-APPROVAL-REQUIRES-SIGNATURE-DOCUMENT',
  'M17-RUNTIME-VENDOR-PORTAL-LINKED-VENDOR-ONLY',
  'M17-RUNTIME-VENDOR-QUOTATION-ONLY-FOR-INVITED-APPROVED-VENDOR',
  'M17-RUNTIME-TECHNICIAN-PWA-ASSIGNED-WORKORDER-ONLY',
  'M17-RUNTIME-TECHNICIAN-ONLINE-COMMAND-STATE-MACHINE',
  'M17-RUNTIME-QR-SCAN-NEVER-BYPASSES-AUTHORIZATION',
  'M17-RUNTIME-PWA-EVIDENCE-USES-DOCUMENT-STORAGE',
  'M17-RUNTIME-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPED',
  'M17-RUNTIME-OFFLINE-SYNC-CLIENT-COMMAND-IDEMPOTENT',
  'M17-RUNTIME-OFFLINE-SYNC-REJECTS-STALE-CONFLICTING-COMMANDS',
  'M17-RUNTIME-PORTAL-ACTIONS-AUDITED',
  'M17-RUNTIME-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE',
  'M17-RUNTIME-OFFLINE-WORKER-NO-CRITICAL-ASYNC-MUTATION',
]);

export const PortalPwaOfflineRuntimeScenarios = PortalPwaOfflineRuntimeScenarioIdSchema.options;

export const PortalLinkedSubjectSchema = z.object({
  organizationId: UuidSchema,
  userId: UuidSchema,
  actorType: z.enum(['CUSTOMER', 'VENDOR', 'TECHNICIAN']),
  customerId: UuidSchema.optional(),
  vendorId: UuidSchema.optional(),
  technicianEmployeeId: UuidSchema.optional(),
  branchId: UuidSchema.nullable().optional(),
  permissions: z.array(z.string().min(1).max(160)).default([]),
});

export const PortalCustomerSurfaceRequestSchema = z.object({
  organizationId: UuidSchema,
  customerId: UuidSchema,
  surface: z.enum(['DASHBOARD', 'PROJECTS', 'CONTRACTS', 'SITES', 'ASSETS', 'TICKETS', 'WORK_ORDERS', 'INVOICES', 'PAYMENTS', 'WARRANTIES', 'DOCUMENTS']),
  requiredPermission: z.string().min(1).max(160),
});

export const PortalVendorSurfaceRequestSchema = z.object({
  organizationId: UuidSchema,
  vendorId: UuidSchema,
  surface: z.enum(['RFQS', 'QUOTATIONS', 'PURCHASE_ORDERS', 'DELIVERIES', 'GOODS_RECEIVED', 'INVOICES', 'PAYMENTS', 'PERFORMANCE', 'DOCUMENTS']),
  requiredPermission: z.string().min(1).max(160),
});

export const TechnicianPwaCommandCompletionSchema = z.object({
  organizationId: UuidSchema,
  workOrderId: UuidSchema,
  branchId: UuidSchema.nullable().optional(),
  assignedTechnicianId: UuidSchema,
  action: z.enum(['ACCEPT', 'START_TRAVEL', 'ARRIVE', 'CHECK_IN', 'LOCATION', 'START_WORK', 'ADD_PHOTO', 'USE_PART', 'SIGNATURE', 'SERVICE_REPORT', 'CHECK_OUT', 'COMPLETE']),
  occurredAt: IsoDateTimeSchema,
  documentIds: z.array(UuidSchema).default([]),
  clientCommandId: z.string().min(8).max(120).optional(),
  payloadHash: z.string().min(32).max(128).optional(),
});

export const OfflineSyncBatchCompletionSchema = z.object({
  organizationId: UuidSchema,
  technicianUserId: UuidSchema,
  technicianEmployeeId: UuidSchema,
  deviceId: z.string().min(3).max(160),
  tenantClockAt: IsoDateTimeSchema,
  maxOfflineHours: z.number().int().min(0).max(168),
  commands: z.array(TechnicianPwaCommandCompletionSchema.extend({
    clientCommandId: z.string().min(8).max(120),
    payloadHash: z.string().min(32).max(128),
  })).min(1).max(200),
});

export const OfflineSyncReplayDecisionSchema = z.object({
  clientCommandId: z.string().min(8).max(120),
  incomingPayloadHash: z.string().min(32).max(128),
  existingPayloadHash: z.string().min(32).max(128).optional(),
  status: z.enum(['ACCEPTED', 'REPLAYED', 'REJECTED_CONFLICT', 'REJECTED_STALE', 'REJECTED_SCOPE']),
});

export const PortalPwaOfflineCompletionRows = PortalPwaOfflineCompletionSubjects.map((subject) => ({
  subject,
  sourcePreflightRequired: true,
  runtimeCertificationRequired: true,
  tenantScoped: true,
  portalLinkedScope: !subject.includes('NO_ASYNC'),
  idempotencyRequired: subject.includes('OFFLINE_SYNC') || subject.includes('WORK_APPROVAL') || subject.includes('QUOTATION'),
}));

export const PortalPwaOfflineCompletionManifest = {
  pass: 'M17',
  name: 'Customer Portal, Vendor Portal, Technician PWA and Offline Sync Completion',
  sourcePreflight: MISSING_PASS_M17_SOURCE_PREFLIGHT_PORTALS_PWA_OFFLINE_COMPLETION,
  routes: PortalPwaOfflineCompletionRoutes,
  subjects: PortalPwaOfflineCompletionSubjects,
  invariants: PortalPwaOfflineCompletionInvariants,
  runtimeScenarios: PortalPwaOfflineRuntimeScenarios,
  asyncBoundary: 'Offline replay must call existing transactional command services; workers may send post-commit notifications only and must not mutate stock, money, approval, invoice-balance or journal state.',
} as const;
