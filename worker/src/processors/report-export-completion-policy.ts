import type { WorkerReportExportJob } from '../queues/job-contracts.js';

export const M16_REPORT_EXPORT_WORKER_COMPLETION_POLICY = 'M16_REPORT_EXPORT_WORKER_COMPLETION_POLICY' as const;

const forbiddenCriticalPayloadKeys = [
  'stockTransaction',
  'stockBalance',
  'inventoryAdjustment',
  'paymentPosting',
  'journalEntry',
  'approvalState',
  'invoiceBalance',
  'goodsReceiptPosting',
] as const;

export function assertM16ReportExportReadModelOnly(job: WorkerReportExportJob): void {
  if (!job.organizationId || !job.reportExecutionId || !job.idempotencyKey) {
    throw new Error('M16-REPORT-EXPORT-EXECUTION-SCOPE violation: report export job requires tenant, execution id and idempotency key.');
  }
  const payload = JSON.stringify(job.parametersJson ?? {});
  for (const key of forbiddenCriticalPayloadKeys) {
    if (payload.includes(key)) {
      throw new Error(`M16-NO-ASYNC-CRITICAL-MUTATION violation: report.export cannot carry critical mutation payload ${key}.`);
    }
  }
}
