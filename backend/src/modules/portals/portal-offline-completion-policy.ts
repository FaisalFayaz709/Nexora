export const M17_PORTALS_PWA_OFFLINE_COMPLETION_POLICY = 'M17_PORTALS_PWA_OFFLINE_COMPLETION_POLICY' as const;

export type M17PortalActorType = 'CUSTOMER' | 'VENDOR' | 'TECHNICIAN' | 'INTERNAL';

export interface M17PortalActorContext {
  readonly organizationId: string;
  readonly userId: string;
  readonly actorType: M17PortalActorType;
  readonly customerId?: string | null;
  readonly vendorId?: string | null;
  readonly technicianEmployeeId?: string | null;
  readonly branchId?: string | null;
  readonly permissions: readonly string[];
}

export interface M17PortalResourceScope {
  readonly organizationId: string;
  readonly customerId?: string | null;
  readonly vendorId?: string | null;
  readonly branchId?: string | null;
  readonly assignedTechnicianId?: string | null;
  readonly requiredPermission?: string | null;
}

export interface M17OfflineCommandReplay {
  readonly organizationId: string;
  readonly technicianUserId: string;
  readonly technicianEmployeeId: string;
  readonly deviceId: string;
  readonly clientCommandId: string;
  readonly action: string;
  readonly occurredAt: Date;
  readonly payloadHash: string;
  readonly existingPayloadHash?: string | null;
  readonly maxOfflineHours: number;
  readonly tenantClockAt: Date;
}

const CRITICAL_ASYNC_MUTATION_KEYS = [
  'stockTransaction',
  'stockBalance',
  'serialStatus',
  'paymentPosting',
  'invoiceBalance',
  'journalEntry',
  'approvalState',
  'purchaseOrderStatus',
  'goodsReceiptStatus',
  'workOrderStatus',
  'assetHistory',
  'assetLifecycleStatus',
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function hasPermission(actor: M17PortalActorContext, permission?: string | null): boolean {
  return !permission || actor.permissions.includes(permission);
}

function assertSameTenant(actor: M17PortalActorContext, resource: Pick<M17PortalResourceScope, 'organizationId'>): void {
  if (actor.organizationId !== resource.organizationId) {
    fail('M17-NO-CROSS-TENANT-PORTAL-DATA violation: portal/PWA resource is outside authenticated tenant.');
  }
}

export function assertM17PortalLinkedSubject(actor: M17PortalActorContext): void {
  if (actor.actorType === 'CUSTOMER' && !actor.customerId) {
    fail('M17-CUSTOMER-PORTAL-LINKED-CUSTOMER-SURFACES violation: customer portal account is not linked to a customer.');
  }
  if (actor.actorType === 'VENDOR' && !actor.vendorId) {
    fail('M17-VENDOR-PORTAL-LINKED-VENDOR-RFQ-PO-INVOICE-SCOPE violation: vendor portal account is not linked to a vendor.');
  }
  if (actor.actorType === 'TECHNICIAN' && !actor.technicianEmployeeId) {
    fail('M17-TECHNICIAN-PWA-ASSIGNED-JOB-SCOPE violation: technician PWA account is not linked to an employee/technician.');
  }
}

export function assertM17CustomerPortalSurfaceScope(actor: M17PortalActorContext, resource: M17PortalResourceScope): void {
  assertSameTenant(actor, resource);
  assertM17PortalLinkedSubject(actor);
  if (actor.actorType !== 'CUSTOMER' || actor.customerId !== resource.customerId) {
    fail('M17-CUSTOMER-PORTAL-LINKED-CUSTOMER-SURFACES violation: customer portal surface is outside linked customer scope.');
  }
  if (!hasPermission(actor, resource.requiredPermission)) {
    fail('M17-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE violation: customer portal actor is missing required source permission.');
  }
}

export function assertM17CustomerWorkApprovalSignature(input: { approved: boolean; signatureDocumentId?: string | null; customerConfirmedAt?: Date | null }): void {
  if (input.approved && !input.signatureDocumentId) {
    fail('M17-CUSTOMER-PORTAL-WORK-APPROVAL-SIGNATURE-DOCUMENT violation: completed-work approval requires a signature Document reference.');
  }
  if (input.approved && !input.customerConfirmedAt) {
    fail('M17-CUSTOMER-PORTAL-WORK-APPROVAL-SIGNATURE-DOCUMENT violation: completed-work approval requires a customer confirmation timestamp.');
  }
}

export function assertM17VendorPortalSurfaceScope(actor: M17PortalActorContext, resource: M17PortalResourceScope): void {
  assertSameTenant(actor, resource);
  assertM17PortalLinkedSubject(actor);
  if (actor.actorType !== 'VENDOR' || actor.vendorId !== resource.vendorId) {
    fail('M17-VENDOR-PORTAL-LINKED-VENDOR-RFQ-PO-INVOICE-SCOPE violation: vendor portal surface is outside linked vendor scope.');
  }
  if (!hasPermission(actor, resource.requiredPermission)) {
    fail('M17-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE violation: vendor portal actor is missing required source permission.');
  }
}

export function assertM17VendorQuotationSubmissionGuard(input: { invitedVendorId: string; actorVendorId: string; vendorStatus: string; rfqStatus: string; hasDuplicateQuote: boolean }): void {
  if (input.invitedVendorId !== input.actorVendorId) {
    fail('M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD violation: only the invited linked vendor can submit quotation.');
  }
  if (input.vendorStatus !== 'APPROVED') {
    fail('M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD violation: vendor must be approved before quotation submission.');
  }
  if (!['PUBLISHED', 'OPEN'].includes(input.rfqStatus)) {
    fail('M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD violation: RFQ is not open for vendor quotation.');
  }
  if (input.hasDuplicateQuote) {
    fail('M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD violation: duplicate vendor quotation requires idempotent replay, not a second quote.');
  }
}

export function assertM17TechnicianPwaJobScope(actor: M17PortalActorContext, resource: M17PortalResourceScope): void {
  assertSameTenant(actor, resource);
  assertM17PortalLinkedSubject(actor);
  if (actor.actorType !== 'TECHNICIAN' || actor.technicianEmployeeId !== resource.assignedTechnicianId) {
    fail('M17-TECHNICIAN-PWA-ASSIGNED-JOB-SCOPE violation: technician PWA command is not for an assigned work order.');
  }
  if (actor.branchId && resource.branchId && actor.branchId !== resource.branchId) {
    fail('M17-TECHNICIAN-PWA-ASSIGNED-JOB-SCOPE violation: assigned work order is outside technician branch scope.');
  }
}

const allowedTransitions: Record<string, readonly string[]> = {
  ASSIGNED: ['ACCEPT'],
  TECHNICIAN_ACCEPTED: ['START_TRAVEL'],
  TRAVELLING: ['ARRIVE'],
  ON_SITE: ['CHECK_IN', 'START_WORK'],
  WORK_IN_PROGRESS: ['ADD_PHOTO', 'USE_PART', 'SIGNATURE', 'SERVICE_REPORT', 'CHECK_OUT', 'COMPLETE'],
  CUSTOMER_CONFIRMATION: ['COMPLETE'],
};

export function assertM17TechnicianOnlineCommandStateMachine(input: { currentStatus: string; action: string; hasActiveVisit?: boolean; evidenceDocumentIds?: readonly string[]; rawInlineBlob?: string | null }): void {
  const allowed = allowedTransitions[input.currentStatus] ?? [];
  if (!allowed.includes(input.action)) {
    fail('M17-TECHNICIAN-PWA-ONLINE-COMMAND-STATE-MACHINE violation: technician command is not allowed from current work-order status.');
  }
  if (['ADD_PHOTO', 'SIGNATURE', 'SERVICE_REPORT'].includes(input.action)) {
    assertM17PwaDocumentBackedEvidence({ documentIds: input.evidenceDocumentIds ?? [], rawInlineBlob: input.rawInlineBlob });
  }
  if (input.action === 'COMPLETE' && !input.hasActiveVisit) {
    fail('M17-TECHNICIAN-PWA-ONLINE-COMMAND-STATE-MACHINE violation: completion requires visit evidence.');
  }
}

export function assertM17QrScanAuthorization(input: { tokenResolved: boolean; authenticated: boolean; linkedOrAssigned: boolean; tenantMatched: boolean }): void {
  if (input.tokenResolved && (!input.authenticated || !input.linkedOrAssigned || !input.tenantMatched)) {
    fail('M17-TECHNICIAN-PWA-QR-SCAN-AUTHORIZATION violation: QR scan resolves context only and cannot bypass tenant/linked/assigned authorization.');
  }
}

export function assertM17PwaDocumentBackedEvidence(input: { documentIds: readonly string[]; rawInlineBlob?: string | null }): void {
  if (input.rawInlineBlob) {
    fail('M17-TECHNICIAN-PWA-DOCUMENT-BACKED-EVIDENCE violation: PWA evidence must reference Documents stored through StorageService, not inline blobs.');
  }
  if (input.documentIds.length < 1 || input.documentIds.some((id) => !id.trim())) {
    fail('M17-TECHNICIAN-PWA-DOCUMENT-BACKED-EVIDENCE violation: evidence command requires valid Document IDs.');
  }
}

export function assertM17OfflineSyncBatchScope(actor: M17PortalActorContext, command: M17OfflineCommandReplay): void {
  if (actor.organizationId !== command.organizationId) {
    fail('M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE violation: offline batch tenant mismatch.');
  }
  if (actor.actorType !== 'TECHNICIAN' || actor.userId !== command.technicianUserId || actor.technicianEmployeeId !== command.technicianEmployeeId) {
    fail('M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE violation: offline batch is not owned by authenticated technician.');
  }
  if (!command.deviceId.trim()) {
    fail('M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE violation: offline batch requires stable deviceId.');
  }
}

export function assertM17OfflineCommandIdempotency(command: M17OfflineCommandReplay): 'ACCEPTED' | 'REPLAYED' {
  if (!command.clientCommandId.trim() || !command.payloadHash.trim()) {
    fail('M17-OFFLINE-SYNC-CLIENT-COMMAND-IDEMPOTENCY violation: clientCommandId and payloadHash are required.');
  }
  if (command.existingPayloadHash && command.existingPayloadHash !== command.payloadHash) {
    fail('M17-OFFLINE-SYNC-CLIENT-COMMAND-IDEMPOTENCY violation: same clientCommandId cannot be replayed with different payload.');
  }
  return command.existingPayloadHash ? 'REPLAYED' : 'ACCEPTED';
}

export function assertM17OfflineOrderingAndConflictPolicy(commands: readonly M17OfflineCommandReplay[]): void {
  let previous = 0;
  const seen = new Set<string>();
  for (const command of commands) {
    const ageHours = Math.max(0, (command.tenantClockAt.getTime() - command.occurredAt.getTime()) / 3_600_000);
    if (ageHours > command.maxOfflineHours) {
      fail('M17-OFFLINE-SYNC-ORDERING-AND-CONFLICT-POLICY violation: stale offline command is outside configured maxOfflineHours.');
    }
    const time = command.occurredAt.getTime();
    if (time < previous) {
      fail('M17-OFFLINE-SYNC-ORDERING-AND-CONFLICT-POLICY violation: commands must be replayed in occurredAt order.');
    }
    previous = time;
    if (seen.has(command.clientCommandId)) {
      fail('M17-OFFLINE-SYNC-ORDERING-AND-CONFLICT-POLICY violation: duplicate clientCommandId in batch.');
    }
    seen.add(command.clientCommandId);
  }
}

export function assertM17PortalActivityAuditTrail(input: { action: string; actorUserId: string; portalAccountId?: string | null; subjectType: string; subjectId: string; auditAction: string }): void {
  if (!input.action || !input.actorUserId || !input.subjectType || !input.subjectId || !input.auditAction) {
    fail('M17-PORTAL-ACTIVITY-AUDIT-TRAIL violation: portal mutation requires PortalActivityLog and AuditLog evidence.');
  }
}

export function assertM17PortalDocumentInvoicePaymentScope(actor: M17PortalActorContext, resource: M17PortalResourceScope): void {
  if (actor.actorType === 'CUSTOMER') return assertM17CustomerPortalSurfaceScope(actor, resource);
  if (actor.actorType === 'VENDOR') return assertM17VendorPortalSurfaceScope(actor, resource);
  if (actor.actorType === 'TECHNICIAN') return assertM17TechnicianPwaJobScope(actor, resource);
  if (!hasPermission(actor, resource.requiredPermission)) {
    fail('M17-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE violation: internal actor lacks source permission.');
  }
}

export function assertM17NoAsyncCriticalMutation(job: Record<string, unknown>): void {
  for (const key of CRITICAL_ASYNC_MUTATION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(job, key)) {
      fail('M17-NO-ASYNC-CRITICAL-MUTATION violation: portal/offline worker payload cannot mutate critical stock, money, approval, invoice or journal state.');
    }
  }
}
