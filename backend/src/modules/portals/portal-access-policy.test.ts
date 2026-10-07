import { describe, expect, it } from 'vitest';
import {
  assertCustomerPortalScope,
  assertOfflineSyncSafety,
  assertPortalActionAuditable,
  assertPortalDocumentVisibility,
  assertPortalPaymentInvoiceScope,
  assertPortalTokenNotAuthorization,
  assertPwaEvidenceUsesDocumentStorage,
  assertQrPortalAuthorization,
  assertTechnicianWorkOrderScope,
  assertVendorPortalScope,
  type PortalActorContext,
} from './portal-access-policy.js';

const customer: PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-customer',
  actorType: 'CUSTOMER',
  customerId: 'customer-1',
  permissions: ['invoice.view', 'document.view'],
};

const vendor: PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-vendor',
  actorType: 'VENDOR',
  vendorId: 'vendor-1',
  permissions: ['payment.view', 'document.view'],
};

const technician: PortalActorContext = {
  organizationId: 'org-1',
  userId: 'user-technician',
  actorType: 'TECHNICIAN',
  technicianEmployeeId: 'emp-1',
  branchId: 'branch-1',
  permissions: ['workorder.view', 'asset.view'],
};

describe('C14 portal access policy', () => {
  it('C14-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE: restricts customer portal data to linked customer', () => {
    expect(() => assertCustomerPortalScope(customer, { organizationId: 'org-1', customerId: 'customer-1' })).not.toThrow();
    expect(() => assertCustomerPortalScope(customer, { organizationId: 'org-1', customerId: 'customer-2' })).toThrow('linked to this customer');
  });

  it('C14-VENDOR-PORTAL-LINKED-VENDOR-SCOPE: restricts vendor portal data to linked vendor', () => {
    expect(() => assertVendorPortalScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-1' })).not.toThrow();
    expect(() => assertVendorPortalScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-2' })).toThrow('linked to this vendor');
  });

  it('C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE: restricts technician commands to assigned jobs', () => {
    expect(() => assertTechnicianWorkOrderScope(technician, { organizationId: 'org-1', branchId: 'branch-1', assignedTechnicianId: 'emp-1' })).not.toThrow();
    expect(() => assertTechnicianWorkOrderScope(technician, { organizationId: 'org-1', branchId: 'branch-1', assignedTechnicianId: 'emp-2' })).toThrow('not assigned');
  });

  it('C14-PORTAL-TOKEN-NEVER-BYPASSES-AUTHORIZATION: prevents token-only access', () => {
    expect(() => assertPortalTokenNotAuthorization({ tokenResolved: true, authenticated: true, authorized: true })).not.toThrow();
    expect(() => assertPortalTokenNotAuthorization({ tokenResolved: true, authenticated: false, authorized: false })).toThrow('cannot grant access');
  });

  it('C14-QR-ASSET-RESOLUTION-AUTHORIZED: allows QR only inside authorized customer or technician context', () => {
    expect(() => assertQrPortalAuthorization(customer, { organizationId: 'org-1', customerId: 'customer-1' })).not.toThrow();
    expect(() => assertQrPortalAuthorization(technician, { organizationId: 'org-1', assignedTechnicianId: 'emp-1' })).not.toThrow();
    expect(() => assertQrPortalAuthorization(customer, { organizationId: 'org-2', customerId: 'customer-1' })).toThrow('outside authenticated organization');
  });

  it('C14-PORTAL-PERMISSION-FILTERED-DOCUMENTS-INVOICES-PAYMENTS: applies source permissions', () => {
    expect(() => assertPortalDocumentVisibility(customer, { organizationId: 'org-1', customerId: 'customer-1', requiredPermission: 'invoice.view' })).not.toThrow();
    expect(() => assertPortalPaymentInvoiceScope(vendor, { organizationId: 'org-1', vendorId: 'vendor-1' })).not.toThrow();
    expect(() => assertPortalDocumentVisibility(customer, { organizationId: 'org-1', customerId: 'customer-1', requiredPermission: 'finance.view' })).toThrow('missing source permission');
  });

  it('C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED: guards replay and ownership', () => {
    expect(() => assertOfflineSyncSafety(technician, { organizationId: 'org-1', workOrderId: 'wo-1', technicianEmployeeId: 'emp-1', clientCommandId: 'cmd-1', action: 'CHECK_IN' }, new Set())).not.toThrow();
    expect(() => assertOfflineSyncSafety(technician, { organizationId: 'org-1', workOrderId: 'wo-1', technicianEmployeeId: 'emp-1', clientCommandId: 'cmd-1', action: 'CHECK_IN' }, new Set(['cmd-1']))).toThrow('unique clientCommandId');
  });

  it('C14-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE: requires document references for photos and signatures', () => {
    expect(() => assertPwaEvidenceUsesDocumentStorage({ photoDocumentIds: ['doc-photo'], signatureDocumentIds: ['doc-sign'] })).not.toThrow();
    expect(() => assertPwaEvidenceUsesDocumentStorage({ rawBase64Inline: 'data:image/png;base64,abc' })).toThrow('Document references');
  });

  it('C14-PORTAL-ACTIONS-AUDITED: requires auditable portal mutation metadata', () => {
    expect(() => assertPortalActionAuditable({ action: 'CUSTOMER_WORK_APPROVED', subjectType: 'WorkOrder', subjectId: 'wo-1', actorUserId: 'user-customer' })).not.toThrow();
    expect(() => assertPortalActionAuditable({ action: '', subjectType: 'WorkOrder', subjectId: 'wo-1', actorUserId: 'user-customer' })).toThrow('stable audit action');
  });

  it('C14-NO-CROSS-TENANT-PORTAL-DATA: rejects every portal resource outside authenticated organization', () => {
    expect(() => assertCustomerPortalScope(customer, { organizationId: 'org-2', customerId: 'customer-1' })).toThrow('outside authenticated organization');
    expect(() => assertVendorPortalScope(vendor, { organizationId: 'org-2', vendorId: 'vendor-1' })).toThrow('outside authenticated organization');
    expect(() => assertTechnicianWorkOrderScope(technician, { organizationId: 'org-2', branchId: 'branch-1', assignedTechnicianId: 'emp-1' })).toThrow('outside authenticated organization');
  });

});
