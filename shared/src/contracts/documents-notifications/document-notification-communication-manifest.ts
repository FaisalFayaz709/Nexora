import { z } from 'zod';

export const C12_DOCUMENTS_NOTIFICATIONS_COMMUNICATION_LOG = 'C12_DOCUMENTS_NOTIFICATIONS_COMMUNICATION_LOG' as const;

export const DocumentEngagementSubjectSchema = z.enum([
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

export const DocumentEngagementControlIds = [
  'C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT',
  'C12-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG',
  'C12-MINIO-ONLY-THROUGH-STORAGE-SERVICE',
  'C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE',
  'C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE',
  'C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY',
  'C12-COMMUNICATION-ATTACHMENTS-REFERENCE-DOCUMENTS-NOT-OBJECT-SECRETS',
  'C12-DOCUMENT-EXPIRY-SCAN-EVENT-TO-NOTIFICATION',
  'C12-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION',
] as const;

export type DocumentEngagementControlId = (typeof DocumentEngagementControlIds)[number];

export const DocumentEngagementWorkflowManifest = {
  pass: 'C12',
  name: 'Documents, Notifications and Communication Log',
  controls: DocumentEngagementControlIds,
  documentSubjects: DocumentEngagementSubjectSchema.options,
  storageBoundary: 'StorageService only; business modules never call MinIO SDK directly.',
  asyncBoundary: 'BullMQ may deliver email, notification fan-out, expiry alerts and scan/export jobs only after transactional business state is committed.',
  criticalMutationBoundary: 'Document metadata/link/version/audit changes are transactional; stock, money and approval effects stay in owning modules.',
} as const;

export const DocumentLinkCommandSchema = z.object({
  documentId: z.string().uuid(),
  subjectType: DocumentEngagementSubjectSchema,
  subjectId: z.string().uuid(),
  category: z.string().min(1).max(80),
});

export const DocumentExpiryNotificationSchema = z.object({
  documentId: z.string().uuid(),
  expiresAt: z.string().datetime({ offset: true }),
  recipientUserId: z.string().uuid(),
  title: z.string().min(1).max(240),
  body: z.string().min(1).max(2000),
});

export const CommunicationTraceSchema = z.object({
  communicationId: z.string().uuid(),
  subjectType: DocumentEngagementSubjectSchema,
  subjectId: z.string().uuid().optional(),
  channel: z.enum(['EMAIL', 'SMS', 'PORTAL', 'IN_APP', 'MANUAL']),
  status: z.enum(['DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED']),
  attachmentDocumentIds: z.array(z.string().uuid()).default([]),
});
