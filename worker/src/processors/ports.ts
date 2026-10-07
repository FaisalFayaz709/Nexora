import { deferred, type ProcessorResult } from './result.js';
import type {
  DocumentGenerateInvoiceJob,
  DocumentScanJob,
  EmailSendJob,
  MaintenanceScanJob,
  NotificationCreateJob,
  WorkerReportExportJob,
  WebhookDeliverJob,
} from '../queues/job-contracts.js';
import type { WorkerConfig } from '../config/worker-config.js';
import { runMaintenanceScanDiscoverOnly } from './maintenance-scan-policy.js';
import { processC12DocumentScan, processC12EmailOutbox, processC12NotificationCreate, processPass17WebhookDelivery } from './document-notification-delivery-policy.js';
import { processC13ReportExport } from './report-export-policy.js';

export interface WorkerPorts {
  generateInvoiceDocument(job: DocumentGenerateInvoiceJob): Promise<ProcessorResult>;
  sendEmail(job: EmailSendJob): Promise<ProcessorResult>;
  createNotification(job: NotificationCreateJob): Promise<ProcessorResult>;
  scanMaintenance(job: MaintenanceScanJob): Promise<ProcessorResult>;
  exportReport(job: WorkerReportExportJob): Promise<ProcessorResult>;
  deliverWebhook(job: WebhookDeliverJob): Promise<ProcessorResult>;
  scanDocument(job: DocumentScanJob): Promise<ProcessorResult>;
}

export function createDefaultWorkerPorts(config: WorkerConfig): WorkerPorts {
  return {
    async generateInvoiceDocument(job) {
      return deferred(
        'Invoice PDF rendering is intentionally delegated to the Finance/Documents completion pass; this worker consumed and validated the BullMQ job safely.',
        job.idempotencyKey,
      );
    },
    async sendEmail(job) {
      return processC12EmailOutbox(job, config.WORKER_EMAIL_DELIVERY_ENABLED);
    },
    async createNotification(job) {
      return processC12NotificationCreate(job);
    },
    async scanMaintenance(job) {
      return runMaintenanceScanDiscoverOnly(job);
    },
    async exportReport(job) {
      return processC13ReportExport(job, false);
    },
    async deliverWebhook(job) {
      return processPass17WebhookDelivery(job, config.WORKER_WEBHOOK_DELIVERY_ENABLED);
    },
    async scanDocument(job) {
      return processC12DocumentScan(job);
    },
  };
}
