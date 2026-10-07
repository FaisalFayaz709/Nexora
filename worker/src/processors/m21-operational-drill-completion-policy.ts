export const M21_WORKER_OPERATIONAL_DRILL_COMPLETION_POLICY =
  'M21_WORKER_OPERATIONAL_DRILL_COMPLETION_POLICY' as const;

const forbiddenCriticalMutationMarkers = [
  'stockBalance.update',
  'stockTransaction.create',
  'journalEntry.create',
  'payment.create',
  'supplierInvoice.update',
  'approvalRequest.update',
  'asset.update',
  'workOrder.update',
  'maintenanceExecution.update',
] as const;

export type M21OperationalDrillJobKind =
  | 'PERFORMANCE_EVIDENCE_COLLECTION'
  | 'BACKUP_CHECKSUM_COLLECTION'
  | 'RESTORE_DRILL_EVIDENCE_COLLECTION'
  | 'OBSERVABILITY_SIGNAL_COLLECTION'
  | 'QUEUE_BACKPRESSURE_EVIDENCE_COLLECTION'
  | 'DR_ROLLBACK_EVIDENCE_COLLECTION';

export interface M21OperationalDrillJobPayload {
  readonly kind: M21OperationalDrillJobKind;
  readonly organizationId: string;
  readonly runId: string;
  readonly evidenceOnly: boolean;
  readonly payloadMarkers?: readonly string[];
}

export function assertM21OperationalDrillWorkerJob(payload: M21OperationalDrillJobPayload): void {
  if (!payload.evidenceOnly) {
    throw new Error('M21-WORKER-QUEUE-BACKPRESSURE-GATE: operational drill workers must be evidence-only.');
  }
  if (!payload.organizationId || !payload.runId) {
    throw new Error('M21-WORKER-QUEUE-BACKPRESSURE-GATE: operational drill jobs require organizationId and runId.');
  }
  const markers = payload.payloadMarkers ?? [];
  const forbidden = markers.filter((marker) => forbiddenCriticalMutationMarkers.some((blocked) => marker.includes(blocked)));
  if (forbidden.length > 0) {
    throw new Error(`M21-WORKER-QUEUE-BACKPRESSURE-GATE: operational jobs cannot carry critical mutation payloads: ${forbidden.join(', ')}`);
  }
}

export function m21ForbiddenWorkerMutationMarkers(): readonly string[] {
  return forbiddenCriticalMutationMarkers;
}
