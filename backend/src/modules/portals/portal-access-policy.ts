export const C14_CUSTOMER_VENDOR_TECHNICIAN_PORTALS_POLICY = 'C14_CUSTOMER_VENDOR_TECHNICIAN_PORTALS_POLICY' as const;

export type PortalActorType = 'CUSTOMER' | 'VENDOR' | 'TECHNICIAN' | 'INTERNAL';

export interface PortalActorContext {
  readonly organizationId: string;
  readonly userId: string;
  readonly actorType: PortalActorType;
  readonly customerId?: string | null;
  readonly vendorId?: string | null;
  readonly technicianEmployeeId?: string | null;
  readonly branchId?: string | null;
  readonly permissions: readonly string[];
}

export interface PortalResourceScope {
  readonly organizationId: string;
  readonly customerId?: string | null;
  readonly vendorId?: string | null;
  readonly technicianEmployeeId?: string | null;
  readonly branchId?: string | null;
  readonly assignedTechnicianId?: string | null;
  readonly requiredPermission?: string | null;
}

export interface OfflineCommandScope {
  readonly organizationId: string;
  readonly workOrderId: string;
  readonly technicianEmployeeId: string;
  readonly clientCommandId: string;
  readonly action: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function sameTenant(actor: PortalActorContext, resource: PortalResourceScope): void {
  if (actor.organizationId !== resource.organizationId) {
    fail('C14-NO-CROSS-TENANT-PORTAL-DATA violation: portal resource is outside authenticated organization.');
  }
}

function hasPermission(actor: PortalActorContext, permission?: string | null): boolean {
  if (!permission) return true;
  return actor.permissions.includes(permission);
}

export function assertCustomerPortalScope(actor: PortalActorContext, resource: PortalResourceScope): void {
  sameTenant(actor, resource);
  if (actor.actorType !== 'CUSTOMER') {
    fail('C14-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE violation: actor is not a customer portal identity.');
  }
  if (!actor.customerId || actor.customerId !== resource.customerId) {
    fail('C14-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE violation: customer portal actor is not linked to this customer resource.');
  }
}

export function assertVendorPortalScope(actor: PortalActorContext, resource: PortalResourceScope): void {
  sameTenant(actor, resource);
  if (actor.actorType !== 'VENDOR') {
    fail('C14-VENDOR-PORTAL-LINKED-VENDOR-SCOPE violation: actor is not a vendor portal identity.');
  }
  if (!actor.vendorId || actor.vendorId !== resource.vendorId) {
    fail('C14-VENDOR-PORTAL-LINKED-VENDOR-SCOPE violation: vendor portal actor is not linked to this vendor resource.');
  }
}

export function assertTechnicianWorkOrderScope(actor: PortalActorContext, resource: PortalResourceScope): void {
  sameTenant(actor, resource);
  if (actor.actorType !== 'TECHNICIAN') {
    fail('C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE violation: actor is not a technician PWA identity.');
  }
  if (!actor.technicianEmployeeId || actor.technicianEmployeeId !== resource.assignedTechnicianId) {
    fail('C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE violation: technician is not assigned to this work order.');
  }
  if (actor.branchId && resource.branchId && actor.branchId !== resource.branchId) {
    fail('C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE violation: work order is outside technician branch scope.');
  }
}

export function assertPortalTokenNotAuthorization(input: { tokenResolved: boolean; authenticated: boolean; authorized: boolean }): void {
  if (input.tokenResolved && (!input.authenticated || !input.authorized)) {
    fail('C14-PORTAL-TOKEN-NEVER-BYPASSES-AUTHORIZATION violation: token or QR lookup cannot grant access without authenticated authorization.');
  }
}

export function assertQrPortalAuthorization(actor: PortalActorContext, asset: PortalResourceScope): void {
  sameTenant(actor, asset);
  if (actor.actorType === 'CUSTOMER') {
    assertCustomerPortalScope(actor, asset);
    return;
  }
  if (actor.actorType === 'TECHNICIAN') {
    if (!actor.technicianEmployeeId) fail('C14-QR-ASSET-RESOLUTION-AUTHORIZED violation: technician identity is not resolved.');
    if (asset.assignedTechnicianId && asset.assignedTechnicianId !== actor.technicianEmployeeId) {
      fail('C14-QR-ASSET-RESOLUTION-AUTHORIZED violation: technician is not assigned to the asset work context.');
    }
    return;
  }
  if (actor.actorType === 'INTERNAL' && hasPermission(actor, asset.requiredPermission ?? 'asset.view')) return;
  fail('C14-QR-ASSET-RESOLUTION-AUTHORIZED violation: actor cannot resolve this QR asset context.');
}

export function assertPortalDocumentVisibility(actor: PortalActorContext, resource: PortalResourceScope): void {
  sameTenant(actor, resource);
  if (resource.requiredPermission && !hasPermission(actor, resource.requiredPermission)) {
    fail('C14-PORTAL-PERMISSION-FILTERED-DOCUMENTS-INVOICES-PAYMENTS violation: missing source permission for portal document or financial record.');
  }
  if (actor.actorType === 'CUSTOMER') assertCustomerPortalScope(actor, resource);
  if (actor.actorType === 'VENDOR') assertVendorPortalScope(actor, resource);
  if (actor.actorType === 'TECHNICIAN' && resource.assignedTechnicianId) assertTechnicianWorkOrderScope(actor, resource);
}

export function assertOfflineSyncSafety(actor: PortalActorContext, command: OfflineCommandScope, seenClientCommandIds: ReadonlySet<string>): void {
  if (actor.organizationId !== command.organizationId) {
    fail('C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED violation: offline command organization mismatch.');
  }
  if (actor.actorType !== 'TECHNICIAN' || actor.technicianEmployeeId !== command.technicianEmployeeId) {
    fail('C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED violation: offline command is not owned by the authenticated technician.');
  }
  if (!command.clientCommandId.trim() || seenClientCommandIds.has(command.clientCommandId)) {
    fail('C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED violation: offline replay requires a unique clientCommandId.');
  }
}

export function assertPwaEvidenceUsesDocumentStorage(input: { photoDocumentIds?: readonly string[]; signatureDocumentIds?: readonly string[]; rawBase64Inline?: string | null }): void {
  if (input.rawBase64Inline) {
    fail('C14-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE violation: photos/signatures must be Document references, not inline blobs.');
  }
  for (const id of [...(input.photoDocumentIds ?? []), ...(input.signatureDocumentIds ?? [])]) {
    if (!id || !id.trim()) fail('C14-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE violation: evidence document id cannot be blank.');
  }
}

export function assertPortalActionAuditable(input: { action: string; subjectType: string; subjectId: string; actorUserId: string }): void {
  if (!input.action || !input.subjectType || !input.subjectId || !input.actorUserId) {
    fail('C14-PORTAL-ACTIONS-AUDITED violation: portal mutation requires stable audit action, subject and actor.');
  }
}

export function assertPortalPaymentInvoiceScope(actor: PortalActorContext, resource: PortalResourceScope): void {
  assertPortalDocumentVisibility(actor, {
    ...resource,
    requiredPermission: resource.requiredPermission ?? (actor.actorType === 'VENDOR' ? 'payment.view' : 'invoice.view'),
  });
}
