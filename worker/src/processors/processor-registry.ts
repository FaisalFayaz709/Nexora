import type { Job } from 'bullmq';
import { z } from 'zod';
import {
  ContractExpiryScanJobSchema,
  DocumentGenerateInvoiceJobSchema,
  DocumentScanJobSchema,
  EmailSendJobSchema,
  InvoiceOverdueScanJobSchema,
  MaintenanceScanJobSchema,
  NotificationCreateJobSchema,
  ReportExportJobSchema,
  WebhookDeliverJobSchema,
} from '../queues/job-contracts.js';
import { QUEUE_NAMES, type QueueName } from '../queues/queue-names.js';

// Required queue names: document.generate.invoice, email.send, notification.create, maintenance.scan, contract.expiry.scan, invoice.overdue.scan, report.export, webhook.deliver, document.scan.
import type { WorkerPorts } from './ports.js';
import { deferred, type ProcessorResult } from './result.js';

export type QueueProcessor = (job: Job<unknown>) => Promise<ProcessorResult>;

function parseJob<T>(schema: z.ZodType<T>, job: Job<unknown>): T {
  const parsed = schema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(
      `Invalid job payload for ${job.queueName}/${job.name}: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}

export function createProcessorRegistry(ports: WorkerPorts): Record<QueueName, QueueProcessor> {
  return {
    [QUEUE_NAMES.documentGenerateInvoice]: async (job) =>
      ports.generateInvoiceDocument(parseJob(DocumentGenerateInvoiceJobSchema, job)),

    [QUEUE_NAMES.emailSend]: async (job) => ports.sendEmail(parseJob(EmailSendJobSchema, job)),

    [QUEUE_NAMES.notificationCreate]: async (job) =>
      ports.createNotification(parseJob(NotificationCreateJobSchema, job)),

    [QUEUE_NAMES.maintenanceScan]: async (job) =>
      ports.scanMaintenance(parseJob(MaintenanceScanJobSchema, job)),

    [QUEUE_NAMES.contractExpiryScan]: async (job) => {
      const data = parseJob(ContractExpiryScanJobSchema, job);
      return deferred(
        'Contract expiry scanning requires the CRM/Contracts completion pass to query contracts and enqueue notifications.',
        data.idempotencyKey,
      );
    },

    [QUEUE_NAMES.invoiceOverdueScan]: async (job) => {
      const data = parseJob(InvoiceOverdueScanJobSchema, job);
      return deferred(
        'Invoice overdue scan is registered with BullMQ; Finance completion pass must supply the transactional status guard.',
        data.idempotencyKey,
      );
    },

    [QUEUE_NAMES.reportExport]: async (job) => ports.exportReport(parseJob(ReportExportJobSchema, job)),

    [QUEUE_NAMES.webhookDeliver]: async (job) => ports.deliverWebhook(parseJob(WebhookDeliverJobSchema, job)),

    [QUEUE_NAMES.documentScan]: async (job) => ports.scanDocument(parseJob(DocumentScanJobSchema, job)),
  };
}
