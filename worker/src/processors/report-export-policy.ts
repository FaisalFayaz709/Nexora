import { deferred, processed, type ProcessorResult } from './result.js';
import type { WorkerReportExportJob } from '../queues/job-contracts.js';
import { assertM16ReportExportReadModelOnly } from './report-export-completion-policy.js';

export const C13_REPORT_EXPORT_WORKER_POLICY = 'C13_REPORT_EXPORT_WORKER_POLICY' as const;

export function assertReportExportWorkerJob(job: WorkerReportExportJob): void {
  if (!job.organizationId || !job.reportExecutionId || !job.idempotencyKey) {
    throw new Error('C13-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ violation: report export jobs require tenant, execution id and idempotency key.');
  }
  if (!['pdf', 'xlsx', 'csv'].includes(job.format)) {
    throw new Error('C13-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ violation: worker received unsupported export format.');
  }
}

export async function processC13ReportExport(job: WorkerReportExportJob, rendererEnabled: boolean): Promise<ProcessorResult> {
  assertReportExportWorkerJob(job);
  assertM16ReportExportReadModelOnly(job);
  if (!rendererEnabled) {
    return deferred(
      'C13 report.export consumed a validated ReportExecution job; live CSV/XLSX/PDF renderer and MinIO Document attachment remain runtime-configured adapters.',
      job.idempotencyKey,
    );
  }
  return processed(job.reportExecutionId, job.idempotencyKey);
}
