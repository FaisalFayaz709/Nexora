import { describe, expect, it } from 'vitest';
import {
  assertM17CustomerPortalSurfaceScope,
  assertM17CustomerWorkApprovalSignature,
  assertM17NoAsyncCriticalMutation,
  assertM17OfflineCommandIdempotency,
  assertM17OfflineOrderingAndConflictPolicy,
  assertM17OfflineSyncBatchScope,
  assertM17PortalActivityAuditTrail,
  assertM17PortalDocumentInvoicePaymentScope,
  assertM17PortalLinkedSubject,
  assertM17PwaDocumentBackedEvidence,
  assertM17QrScanAuthorization,
  assertM17TechnicianOnlineCommandStateMachine,
  assertM17TechnicianPwaJobScope,
  assertM17VendorPortalSurfaceScope,
  assertM17VendorQuotationSubmissionGuard,
  type M17OfflineCommandReplay,
  type M17PortalActorContext,
} from './portal-offline-completion-policy.js';

const customer: M17PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-customer',
  actorType: 'CUSTOMER',
  customerId: 'customer-1',
  permissions: ['portal.customer.view', 'invoice.view', 'document.view'],
};

const vendor: M17PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-vendor',
  actorType: 'VENDOR',
  vendorId: 'vendor-1',
  permissions: ['portal.vendor.view', 'supplier_quotation.create', 'payment.view', 'document.view'],
};

const technician: M17PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-tech',
  actorType: 'TECHNICIAN',
  technicianEmployeeId: 'emp-1',
  branchId: 'branch-1',
  permissions: ['workorder.view', 'asset.view', 'document.view'],
};

const offlineCommand = (overrides: Partial<M17OfflineCommandReplay> = {}): M17OfflineCommandReplay => ({
  organizationId: 'org-1',
  technicianUserId: 'user-tech',
  technicianEmployeeId: 'emp-1',
  deviceId: 'device-1',
  clientCommandId: 'client-command-1',
  action: 'CHECK_IN',
  occurredAt: new Date('2026-09-06T10:00:00.000Z'),
  tenantClockAt: new Date('2026-09-06T11:00:00.000Z'),
  maxOfflineHours: 24,
  payloadHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ...overrides,
});

describe('M17 portals/PWA/offline completion policy', () => {
  it('M17-CUSTOMER-PORTAL-LINKED-CUSTOMER-SURFACES keeps customer portal linked to one customer', () => {
    expect(() => assertM17PortalLinkedSubject(customer)).not.toThrow();
    expect(() => assertM17CustomerPortalSurfaceScope(customer, { organizationId: 'org-1', customerId: 'customer-1', requiredPermission: 'invoice.view' })).not.toThrow();
    expect(() => assertM17CustomerPortalSurfaceScope(customer, { organizationId: 'org-1', customerId: 'customer-2', requiredPermission: 'invoice.view' })).toThrow('linked customer scope');
  });

  it('M17-CUSTOMER-PORTAL-WORK-APPROVAL-SIGNATURE-DOCUMENT requires Document signature and timestamp', () => {
    expect(() => assertM17CustomerWorkApprovalSignature({ approved: true, signatureDocumentId: 'doc-1', customerConfirmedAt: new Date() })).not.toThrow();
    expect(() => assertM17CustomerWorkApprovalSignature({ approved: true, customerConfirmedAt: new Date() })).toThrow('signature Document');
  });

  it('M17-VENDOR-PORTAL-LINKED-VENDOR-RFQ-PO-INVOICE-SCOPE keeps vendor portal linked to one vendor', () => {
    expect(() => assertM17VendorPortalSurfaceScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-1', requiredPermission: 'payment.view' })).not.toThrow();
    expect(() => assertM17VendorPortalSurfaceScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-2', requiredPermission: 'payment.view' })).toThrow('linked vendor scope');
  });

  it('M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD allows only invited approved vendor against open RFQ', () => {
    expect(() => assertM17VendorQuotationSubmissionGuard({ invitedVendorId: 'vendor-1', actorVendorId: 'vendor-1', vendorStatus: 'APPROVED', rfqStatus: 'OPEN', hasDuplicateQuote: false })).not.toThrow();
    expect(() => assertM17VendorQuotationSubmissionGuard({ invitedVendorId: 'vendor-1', actorVendorId: 'vendor-2', vendorStatus: 'APPROVED', rfqStatus: 'OPEN', hasDuplicateQuote: false })).toThrow('invited linked vendor');
  });

  it('M17-TECHNICIAN-PWA-ASSIGNED-JOB-SCOPE restricts commands to assigned branch-scoped jobs', () => {
    expect(() => assertM17TechnicianPwaJobScope(technician, { organizationId: 'org-1', branchId: 'branch-1', assignedTechnicianId: 'emp-1' })).not.toThrow();
    expect(() => assertM17TechnicianPwaJobScope(technician, { organizationId: 'org-1', branchId: 'branch-1', assignedTechnicianId: 'emp-2' })).toThrow('assigned work order');
  });

  it('M17-TECHNICIAN-PWA-ONLINE-COMMAND-STATE-MACHINE blocks impossible technician state jumps', () => {
    expect(() => assertM17TechnicianOnlineCommandStateMachine({ currentStatus: 'ASSIGNED', action: 'ACCEPT' })).not.toThrow();
    expect(() => assertM17TechnicianOnlineCommandStateMachine({ currentStatus: 'ASSIGNED', action: 'COMPLETE', hasActiveVisit: true })).toThrow('not allowed');
  });

  it('M17-TECHNICIAN-PWA-QR-SCAN-AUTHORIZATION treats QR token as context not authorization', () => {
    expect(() => assertM17QrScanAuthorization({ tokenResolved: true, authenticated: true, linkedOrAssigned: true, tenantMatched: true })).not.toThrow();
    expect(() => assertM17QrScanAuthorization({ tokenResolved: true, authenticated: false, linkedOrAssigned: true, tenantMatched: true })).toThrow('cannot bypass');
  });

  it('M17-TECHNICIAN-PWA-DOCUMENT-BACKED-EVIDENCE rejects inline blobs', () => {
    expect(() => assertM17PwaDocumentBackedEvidence({ documentIds: ['doc-1'] })).not.toThrow();
    expect(() => assertM17PwaDocumentBackedEvidence({ documentIds: [], rawInlineBlob: 'base64-data' })).toThrow('not inline blobs');
  });

  it('M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE binds replay to authenticated technician device', () => {
    expect(() => assertM17OfflineSyncBatchScope(technician, offlineCommand())).not.toThrow();
    expect(() => assertM17OfflineSyncBatchScope(technician, offlineCommand({ technicianEmployeeId: 'emp-2' }))).toThrow('not owned');
  });

  it('M17-OFFLINE-SYNC-CLIENT-COMMAND-IDEMPOTENCY blocks same clientCommandId with different payload hash', () => {
    expect(assertM17OfflineCommandIdempotency(offlineCommand())).toBe('ACCEPTED');
    expect(assertM17OfflineCommandIdempotency(offlineCommand({ existingPayloadHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }))).toBe('REPLAYED');
    expect(() => assertM17OfflineCommandIdempotency(offlineCommand({ existingPayloadHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }))).toThrow('different payload');
  });

  it('M17-OFFLINE-SYNC-ORDERING-AND-CONFLICT-POLICY rejects stale and out-of-order commands', () => {
    expect(() => assertM17OfflineOrderingAndConflictPolicy([offlineCommand({ clientCommandId: 'client-command-1' }), offlineCommand({ clientCommandId: 'client-command-2', occurredAt: new Date('2026-09-06T10:05:00.000Z') })])).not.toThrow();
    expect(() => assertM17OfflineOrderingAndConflictPolicy([offlineCommand({ occurredAt: new Date('2026-09-01T10:00:00.000Z') })])).toThrow('stale offline command');
  });

  it('M17-PORTAL-ACTIVITY-AUDIT-TRAIL requires portal activity and audit evidence', () => {
    expect(() => assertM17PortalActivityAuditTrail({ action: 'portal.customer.work.approved', actorUserId: 'user-customer', portalAccountId: 'portal-1', subjectType: 'WORK_ORDER', subjectId: 'wo-1', auditAction: 'work_order.customer_approved' })).not.toThrow();
    expect(() => assertM17PortalActivityAuditTrail({ action: '', actorUserId: 'user-customer', subjectType: 'WORK_ORDER', subjectId: 'wo-1', auditAction: 'work_order.customer_approved' })).toThrow('AuditLog evidence');
  });

  it('M17-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE keeps commercial documents scoped to portal subject', () => {
    expect(() => assertM17PortalDocumentInvoicePaymentScope(customer, { organizationId: 'org-1', customerId: 'customer-1', requiredPermission: 'invoice.view' })).not.toThrow();
    expect(() => assertM17PortalDocumentInvoicePaymentScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-1', requiredPermission: 'payment.view' })).not.toThrow();
  });

  it('M17-NO-ASYNC-CRITICAL-MUTATION keeps offline worker payload read/orchestration-only for critical state', () => {
    expect(() => assertM17NoAsyncCriticalMutation({ notification: true, portalActivityLogId: 'activity-1' })).not.toThrow();
    expect(() => assertM17NoAsyncCriticalMutation({ paymentPosting: { id: 'payment-1' } })).toThrow('cannot mutate critical');
  });
});
