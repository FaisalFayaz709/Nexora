import { skipped, type ProcessorResult } from './result.js';
import type { MaintenanceScanJob } from '../queues/job-contracts.js';

export const C9_MAINTENANCE_SCAN_PROCESSOR_POLICY = 'C9_MAINTENANCE_SCAN_PROCESSOR_POLICY' as const;

export function assertMaintenanceScanProcessorScope(job: MaintenanceScanJob): void {
  if (job.scope === 'organization' && !job.organizationId) {
    throw new Error('C9 maintenance.scan organization scope requires organizationId.');
  }
  const requestedAt = new Date(job.requestedAt);
  const dueBefore = new Date(job.dueBefore);
  if (Number.isNaN(requestedAt.getTime()) || Number.isNaN(dueBefore.getTime())) {
    throw new Error('C9 maintenance.scan requires valid requestedAt and dueBefore timestamps.');
  }
  if (dueBefore.getTime() < requestedAt.getTime()) {
    throw new Error('C9 maintenance.scan dueBefore cannot be earlier than requestedAt.');
  }
}

export async function runMaintenanceScanDiscoverOnly(job: MaintenanceScanJob): Promise<ProcessorResult> {
  assertMaintenanceScanProcessorScope(job);
  return skipped(
    'C9 maintenance.scan runtime adapter is discover-only until local DB runtime certification wires schedule discovery to tenant-scoped command execution; it must not mutate stock, work-order, asset or execution state directly.',
    job.idempotencyKey,
  );
}
