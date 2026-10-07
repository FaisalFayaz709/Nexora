export const M20_WORKER_FULL_LIFECYCLE_E2E_COMPLETION_POLICY = 'M20_WORKER_FULL_LIFECYCLE_E2E_COMPLETION_POLICY' as const;

export const M20WorkerAllowedEvidenceJobs = [
  'DOCUMENT_EXPIRY_NOTIFICATION',
  'EMAIL_OUTBOX_DELIVERY',
  'REPORT_EXPORT_RENDER',
  'PORTAL_OFFLINE_SYNC_SIDE_EFFECT_LOG',
  'FULL_LIFECYCLE_EVIDENCE_COLLECTION',
] as const;

const forbiddenCriticalMutationMarkers = [
  'stockBalance.update',
  'stockTransaction.create',
  'journalEntry.create',
  'supplierInvoice.update',
  'payment.update',
  'approvalRequest.update',
  'asset.update',
  'workOrder.update',
  'maintenanceExecution.update',
] as const;

export function assertM20WorkerFullLifecycleEvidenceJob(input: {
  readonly jobName: string;
  readonly payloadText: string;
  readonly writesEvidenceOnly: boolean;
  readonly writesCriticalBusinessState: boolean;
}): void {
  if (!M20WorkerAllowedEvidenceJobs.includes(input.jobName as (typeof M20WorkerAllowedEvidenceJobs)[number])) {
    throw new Error(`M20-DOCUMENT-NOTIFICATION-REPORT-EVIDENCE: unsupported lifecycle evidence job ${input.jobName}.`);
  }
  if (!input.writesEvidenceOnly || input.writesCriticalBusinessState) {
    throw new Error('M20-TRANSACTION-ROLLBACK-NO-PARTIAL-STATE: workers may collect side-effect evidence only, not mutate critical lifecycle state.');
  }
  for (const marker of forbiddenCriticalMutationMarkers) {
    if (input.payloadText.includes(marker)) {
      throw new Error(`M20-TRANSACTION-ROLLBACK-NO-PARTIAL-STATE: forbidden critical mutation marker ${marker}.`);
    }
  }
}
