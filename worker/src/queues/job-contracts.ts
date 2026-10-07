import { z } from 'zod';

const Uuid = z.string().uuid();
const IsoDateTime = z.string().datetime({ offset: true });
const PositiveInteger = z.number().int().positive();

export const TenantJobContextSchema = z.object({
  organizationId: Uuid,
  requestedByUserId: Uuid.optional(),
  eventId: Uuid.optional(),
  requestId: z.string().min(1).max(120).optional(),
  idempotencyKey: z.string().min(1).max(200),
  requestedAt: IsoDateTime.default(() => new Date().toISOString()),
});

export const GlobalScanJobContextSchema = z.object({
  scope: z.enum(['all-tenants', 'organization']).default('all-tenants'),
  organizationId: Uuid.optional(),
  idempotencyKey: z.string().min(1).max(200),
  requestedAt: IsoDateTime.default(() => new Date().toISOString()),
});

export const DocumentGenerateInvoiceJobSchema = TenantJobContextSchema.extend({
  invoiceId: Uuid,
  invoiceVersion: PositiveInteger.default(1),
});

export const EmailSendJobSchema = TenantJobContextSchema.extend({
  emailOutboxId: Uuid.optional(),
  template: z.string().min(1).max(120),
  recipient: z.string().email(),
  subject: z.string().min(1).max(240),
  payloadJson: z.record(z.unknown()).default({}),
});

export const NotificationCreateJobSchema = TenantJobContextSchema.extend({
  recipientUserId: Uuid,
  type: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  subjectType: z.string().min(1).max(80).optional(),
  subjectId: Uuid.optional(),
});

export const MaintenanceScanJobSchema = GlobalScanJobContextSchema.extend({
  dueBefore: IsoDateTime,
});

export const ContractExpiryScanJobSchema = GlobalScanJobContextSchema.extend({
  expiresBefore: IsoDateTime,
});

export const InvoiceOverdueScanJobSchema = GlobalScanJobContextSchema.extend({
  asOf: IsoDateTime,
});

export const ReportExportJobSchema = TenantJobContextSchema.extend({
  reportExecutionId: Uuid,
  reportKey: z.string().min(1).max(120),
  format: z.enum(['pdf', 'xlsx', 'csv']),
  parametersJson: z.record(z.unknown()).default({}),
});

export const WebhookDeliverJobSchema = TenantJobContextSchema.extend({
  webhookDeliveryId: Uuid,
  endpointId: Uuid,
  eventType: z.string().min(1).max(120),
  payloadJson: z.record(z.unknown()).default({}),
});

export const DocumentScanJobSchema = TenantJobContextSchema.extend({
  documentId: Uuid,
  documentVersionId: Uuid,
  objectKey: z.string().min(1).max(1024),
  checksumSha256: z.string().min(64).max(64),
});

export type DocumentGenerateInvoiceJob = z.infer<typeof DocumentGenerateInvoiceJobSchema>;
export type EmailSendJob = z.infer<typeof EmailSendJobSchema>;
export type NotificationCreateJob = z.infer<typeof NotificationCreateJobSchema>;
export type MaintenanceScanJob = z.infer<typeof MaintenanceScanJobSchema>;
export type ContractExpiryScanJob = z.infer<typeof ContractExpiryScanJobSchema>;
export type InvoiceOverdueScanJob = z.infer<typeof InvoiceOverdueScanJobSchema>;
export type WorkerReportExportJob = z.infer<typeof ReportExportJobSchema>;
export type WebhookDeliverJob = z.infer<typeof WebhookDeliverJobSchema>;
export type DocumentScanJob = z.infer<typeof DocumentScanJobSchema>;
