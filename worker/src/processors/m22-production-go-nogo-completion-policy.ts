export const M22_WORKER_PRODUCTION_GO_NOGO_COMPLETION_POLICY = 'M22_WORKER_PRODUCTION_GO_NOGO_COMPLETION_POLICY' as const;

const allowedEvidenceJobs = new Set([
  'RELEASE_EVIDENCE_ARCHIVE',
  'POST_DEPLOYMENT_OBSERVATION',
  'ROLLBACK_EVIDENCE_COLLECTION',
]);

const forbiddenCriticalMutationMarkers = [
  'stockBalance.update',
  'stockLedger.create',
  'journalEntry.create',
  'payment.create',
  'approvalDecision.create',
  'invoiceBalance.update',
  'workOrder.updateStatus',
  'asset.install',
  'maintenanceExecution.complete',
];

export interface M22ReleaseEvidenceWorkerJob {
  readonly jobType: string;
  readonly releaseCandidateId: string;
  readonly evidenceOnly: boolean;
  readonly payload: Record<string, unknown>;
}

export function assertM22ReleaseEvidenceWorkerJob(job: M22ReleaseEvidenceWorkerJob): void {
  if (!allowedEvidenceJobs.has(job.jobType)) {
    throw new Error('M22-WORKER-GO-NOGO-EVIDENCE-ONLY: unsupported release evidence worker job.');
  }
  if (!job.releaseCandidateId) {
    throw new Error('M22-WORKER-GO-NOGO-EVIDENCE-ONLY: releaseCandidateId is required.');
  }
  if (!job.evidenceOnly) {
    throw new Error('M22-WORKER-GO-NOGO-EVIDENCE-ONLY: workers may archive evidence and observe only.');
  }
  const payload = JSON.stringify(job.payload ?? {});
  for (const marker of forbiddenCriticalMutationMarkers) {
    if (payload.includes(marker)) {
      throw new Error(`M22-WORKER-GO-NOGO-EVIDENCE-ONLY: critical mutation payloads are forbidden in final Go/No-Go workers: ${marker}`);
    }
  }
}

export const M22AllowedEvidenceWorkerJobs = [...allowedEvidenceJobs] as const;
export const M22ForbiddenCriticalMutationMarkers = [...forbiddenCriticalMutationMarkers] as const;
