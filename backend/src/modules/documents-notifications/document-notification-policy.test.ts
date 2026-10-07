import { describe, expect, it } from 'vitest';
import {
  assertCommunicationTraceability,
  assertDocumentExpiryNotification,
  assertDocumentSubjectAllowed,
  assertDocumentVersionObjectKey,
  assertEmailOutboxDispatch,
  assertNoAsyncCriticalStockMoneyApprovalMutation,
  assertNotificationFanout,
  assertTenantScopedDocumentLink,
  nextDocumentVersionNo,
} from './document-notification-policy.js';

describe('C12 documents, notifications and communication log policy', () => {
  it('C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT enforces tenant and subject scope', () => {
    expect(() => assertDocumentSubjectAllowed('Project')).not.toThrow();
    expect(() => assertTenantScopedDocumentLink({
      documentOrganizationId: 'org-1',
      tenantOrganizationId: 'org-1',
      subjectType: 'Asset',
      subjectId: 'asset-1',
      category: 'WARRANTY',
      actorUserId: 'user-1',
    })).not.toThrow();
    expect(() => assertTenantScopedDocumentLink({
      documentOrganizationId: 'org-1',
      tenantOrganizationId: 'org-2',
      subjectType: 'Asset',
      subjectId: 'asset-1',
      category: 'WARRANTY',
    })).toThrow('C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT');
  });

  it('C12-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG enforces version and checksum rules', () => {
    expect(nextDocumentVersionNo(1)).toBe(2);
    expect(() => assertDocumentVersionObjectKey({
      latestVersionNo: 1,
      newChecksumSha256: 'a'.repeat(64),
      objectKey: 'organizations/tenant-1/documents/file.pdf',
      tenantOrganizationId: 'tenant-1',
    })).not.toThrow();
  });

  it('C12-MINIO-ONLY-THROUGH-STORAGE-SERVICE blocks non-tenant object keys', () => {
    expect(() => assertDocumentVersionObjectKey({
      latestVersionNo: 0,
      newChecksumSha256: 'a'.repeat(64),
      objectKey: 'organizations/other/documents/file.pdf',
      tenantOrganizationId: 'tenant-1',
    })).toThrow('C12-MINIO-ONLY-THROUGH-STORAGE-SERVICE');
  });

  it('C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE requires deduped recipients', () => {
    expect(() => assertNotificationFanout({
      organizationId: 'org-1',
      recipientUserIds: ['u1', 'u2'],
      eventType: 'document.expiring',
      title: 'Document expiry',
      body: 'Warranty document expires soon.',
      subjectType: 'Document',
      subjectId: 'doc-1',
    })).not.toThrow();
    expect(() => assertNotificationFanout({
      organizationId: 'org-1',
      recipientUserIds: ['u1', 'u1'],
      eventType: 'document.expiring',
      title: 'Document expiry',
      body: 'Warranty document expires soon.',
    })).toThrow('C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE');
  });

  it('C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE validates dispatch identity', () => {
    expect(() => assertEmailOutboxDispatch({
      organizationId: 'org-1',
      recipient: 'customer@example.com',
      subject: 'Invoice ready',
      template: 'invoice-ready',
      idempotencyKey: 'email:invoice:1',
    })).not.toThrow();
  });

  it('C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY preserves document references only', () => {
    expect(() => assertCommunicationTraceability({
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'vendor@example.com',
      subject: 'Purchase order',
      body: 'Attached purchase order.',
      attachmentDocumentIds: ['00000000-0000-4000-8000-000000000001'],
    })).not.toThrow();
    expect(() => assertCommunicationTraceability({
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'vendor@example.com',
      subject: 'Purchase order',
      body: 'Attached purchase order.',
      attachmentDocumentIds: ['organizations/org/documents/po.pdf'],
    })).toThrow('C12-COMMUNICATION-ATTACHMENTS-REFERENCE-DOCUMENTS-NOT-OBJECT-SECRETS');
  });

  it('C12-DOCUMENT-EXPIRY-SCAN-EVENT-TO-NOTIFICATION classifies near-expiry documents', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');
    expect(assertDocumentExpiryNotification(new Date('2026-09-20T00:00:00.000Z'), now, 30)).toBe(true);
    expect(assertDocumentExpiryNotification(new Date('2026-11-20T00:00:00.000Z'), now, 30)).toBe(false);
  });

  it('C12-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION keeps queues non-critical', () => {
    expect(() => assertNoAsyncCriticalStockMoneyApprovalMutation('email.send', ['documentId', 'recipient'])).not.toThrow();
    expect(() => assertNoAsyncCriticalStockMoneyApprovalMutation('notification.create', ['approvalState'])).toThrow('C12-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION');
  });
});
