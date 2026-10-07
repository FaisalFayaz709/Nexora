export const C12_DOCUMENTS_NOTIFICATIONS_COMMUNICATION_LOG = 'C12_DOCUMENTS_NOTIFICATIONS_COMMUNICATION_LOG' as const;

export const allowedDocumentSubjects = new Set([
  'Employee',
  'Customer',
  'Vendor',
  'Project',
  'Contract',
  'PurchaseOrder',
  'CustomerInvoice',
  'SupplierInvoice',
  'Asset',
  'WorkOrder',
  'Ticket',
  'MaintenancePlan',
  'SafetyIncident',
  'Manual',
]);

export type DocumentAccessAction = 'VIEW' | 'DOWNLOAD_URL' | 'UPLOAD' | 'LINK' | 'VERSION' | 'DELETE';
export type CommunicationChannel = 'EMAIL' | 'SMS' | 'PORTAL' | 'IN_APP' | 'MANUAL';
export type CommunicationStatus = 'DRAFT' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface DocumentLinkPolicyInput {
  readonly documentOrganizationId: string;
  readonly tenantOrganizationId: string;
  readonly subjectType: string;
  readonly subjectId?: string | null;
  readonly category?: string | null;
  readonly actorUserId?: string | null;
}

export interface DocumentVersionPolicyInput {
  readonly latestVersionNo: number;
  readonly newChecksumSha256: string;
  readonly objectKey: string;
  readonly tenantOrganizationId: string;
}

export interface CommunicationPolicyInput {
  readonly channel: CommunicationChannel;
  readonly status: CommunicationStatus;
  readonly recipient: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly attachmentDocumentIds: readonly string[];
}

export interface EmailOutboxPolicyInput {
  readonly organizationId: string;
  readonly recipient: string;
  readonly subject: string;
  readonly template: string;
  readonly idempotencyKey: string;
}

export interface NotificationFanoutPolicyInput {
  readonly organizationId: string;
  readonly recipientUserIds: readonly string[];
  readonly eventType: string;
  readonly title: string;
  readonly body: string;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
}

export function assertDocumentSubjectAllowed(subjectType: string): void {
  if (!allowedDocumentSubjects.has(subjectType)) {
    throw new Error(`C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT violation: unsupported subjectType ${subjectType}.`);
  }
}

export function assertTenantScopedDocumentLink(input: DocumentLinkPolicyInput): void {
  if (input.documentOrganizationId !== input.tenantOrganizationId) {
    throw new Error('C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT violation: cross-tenant document link blocked.');
  }
  assertDocumentSubjectAllowed(input.subjectType);
  if (input.subjectType !== 'Manual' && !input.subjectId) {
    throw new Error('C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT violation: subjectId is required for business subjects.');
  }
  if (!input.category) {
    throw new Error('C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT violation: link category is required.');
  }
}

export function nextDocumentVersionNo(latestVersionNo: number): number {
  if (!Number.isInteger(latestVersionNo) || latestVersionNo < 0) {
    throw new Error('C12-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG violation: latest version number must be a non-negative integer.');
  }
  return latestVersionNo + 1;
}

export function assertDocumentVersionObjectKey(input: DocumentVersionPolicyInput): void {
  if (!input.objectKey.startsWith(`organizations/${input.tenantOrganizationId}/`)) {
    throw new Error('C12-MINIO-ONLY-THROUGH-STORAGE-SERVICE violation: objectKey must stay under the tenant prefix.');
  }
  if (!/^[a-f0-9]{64}$/i.test(input.newChecksumSha256)) {
    throw new Error('C12-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG violation: checksum must be SHA-256 hex.');
  }
}

export function assertCommunicationTraceability(input: CommunicationPolicyInput): void {
  if (input.channel === 'EMAIL' && !input.subject) {
    throw new Error('C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY violation: email subject is required.');
  }
  if (!input.recipient.trim()) {
    throw new Error('C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY violation: recipient is required.');
  }
  if (!input.body.trim()) {
    throw new Error('C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY violation: body is required.');
  }
  if (input.attachmentDocumentIds.some((id) => id.startsWith('organizations/') || id.includes('/'))) {
    throw new Error('C12-COMMUNICATION-ATTACHMENTS-REFERENCE-DOCUMENTS-NOT-OBJECT-SECRETS violation: attachments must reference Document ids, not object keys.');
  }
}

export function assertNotificationFanout(input: NotificationFanoutPolicyInput): void {
  if (!input.recipientUserIds.length) {
    throw new Error('C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE violation: fan-out requires at least one recipient.');
  }
  if (new Set(input.recipientUserIds).size !== input.recipientUserIds.length) {
    throw new Error('C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE violation: duplicate notification recipients must be deduped before write.');
  }
  if (!input.eventType.trim() || !input.title.trim() || !input.body.trim()) {
    throw new Error('C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE violation: event type, title and body are required.');
  }
}

export function assertEmailOutboxDispatch(input: EmailOutboxPolicyInput): void {
  if (!input.idempotencyKey.trim()) {
    throw new Error('C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE violation: idempotency key is required.');
  }
  if (!input.recipient.includes('@')) {
    throw new Error('C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE violation: email recipient is invalid.');
  }
  if (!input.subject.trim() || !input.template.trim()) {
    throw new Error('C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE violation: subject and template are required.');
  }
}

export function assertDocumentExpiryNotification(expiresAt: Date, now: Date, thresholdDays: number): boolean {
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  if (thresholdDays < 0) throw new Error('C12-DOCUMENT-EXPIRY-SCAN-EVENT-TO-NOTIFICATION violation: thresholdDays must be positive.');
  return expiresAt.getTime() >= now.getTime() && expiresAt.getTime() - now.getTime() <= thresholdMs;
}

export function assertNoAsyncCriticalStockMoneyApprovalMutation(queueName: string, payloadKeys: readonly string[]): void {
  const forbidden = ['stockTransaction', 'journalEntry', 'paymentPosting', 'approvalState', 'invoiceBalance', 'stockBalance'];
  const found = payloadKeys.find((key) => forbidden.includes(key));
  if (found) {
    throw new Error(`C12-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION violation: ${queueName} cannot carry ${found}.`);
  }
}


export function assertDocumentUploadIntentTrace(input: {
  readonly organizationId: string;
  readonly actorUserId?: string | null;
  readonly objectKey: string;
  readonly bucketName: string;
  readonly privateBucket: string;
  readonly expiresInSeconds: number;
}): void {
  if (!input.actorUserId) {
    throw new Error('M15-PRESIGNED-UPLOAD-INTENT-TRACE violation: upload intent must record the requesting user.');
  }
  if (input.bucketName !== input.privateBucket) {
    throw new Error('M15-PRIVATE-BUCKET-DEFAULT violation: upload intent must use the private bucket by default.');
  }
  if (!input.objectKey.startsWith(`organizations/${input.organizationId}/documents/`)) {
    throw new Error('M15-PRIVATE-BUCKET-TENANT-PREFIX violation: upload intent object key must stay under tenant documents prefix.');
  }
  if (!Number.isInteger(input.expiresInSeconds) || input.expiresInSeconds <= 0 || input.expiresInSeconds > 3600) {
    throw new Error('M15-SHORT-LIVED-PRESIGNED-URL violation: upload intent URL must be short lived.');
  }
}

export function assertDocumentRetentionAllowsDelete(input: {
  readonly retentionUntil?: Date | string | null;
  readonly now: Date;
}): void {
  if (!input.retentionUntil) return;
  const retentionUntil = input.retentionUntil instanceof Date ? input.retentionUntil : new Date(input.retentionUntil);
  if (retentionUntil.getTime() > input.now.getTime()) {
    throw new Error('M15-RETENTION-SOFT-DELETE-GUARD violation: document cannot be deleted before retention date.');
  }
}

export function assertCommunicationAttachmentTenantScope(input: {
  readonly attachmentDocumentIds: readonly string[];
  readonly existingTenantDocumentIds: readonly string[];
}): void {
  const uniqueAttachmentIds = [...new Set(input.attachmentDocumentIds)];
  if (uniqueAttachmentIds.length !== input.attachmentDocumentIds.length) {
    throw new Error('M15-COMMUNICATION-ATTACHMENT-DEDUPE violation: duplicate attachment documents must be deduped before write.');
  }
  const existing = new Set(input.existingTenantDocumentIds);
  const missing = uniqueAttachmentIds.filter((id) => !existing.has(id));
  if (missing.length) {
    throw new Error('M15-COMMUNICATION-ATTACHMENT-TENANT-SCOPE violation: all communication attachments must be active documents in the authenticated tenant.');
  }
}

export function assertEmailOutboxIdempotency(input: {
  readonly organizationId: string;
  readonly communicationId?: string | null;
  readonly idempotencyKey: string;
  readonly payloadKeys: readonly string[];
}): void {
  if (!input.organizationId || !input.idempotencyKey.trim()) {
    throw new Error('M15-EMAIL-OUTBOX-IDEMPOTENCY violation: email outbox idempotency key must be tenant scoped.');
  }
  if (input.communicationId && !input.idempotencyKey.includes(input.communicationId)) {
    throw new Error('M15-EMAIL-OUTBOX-IDEMPOTENCY violation: communication email idempotency key must include the communication id.');
  }
  assertNoAsyncCriticalStockMoneyApprovalMutation('email.send', input.payloadKeys);
}

export function assertDocumentDeliveryAfterCommitOnly(input: {
  readonly queueName: string;
  readonly payloadKeys: readonly string[];
}): void {
  assertNoAsyncCriticalStockMoneyApprovalMutation(input.queueName, input.payloadKeys);
}
