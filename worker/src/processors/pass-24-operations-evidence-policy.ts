export const PASS_24_OPERATIONS_EVIDENCE_WORKER_POLICY =
  'PASS_24_OPERATIONS_EVIDENCE_WORKER_POLICY' as const;

export type Pass24OperationsEvidenceJobKind =
  | 'PERFORMANCE_SLO_CAPTURE'
  | 'BACKUP_CHECKSUM_CAPTURE'
  | 'RESTORE_DRILL_CAPTURE'
  | 'OBSERVABILITY_TRACE_CAPTURE'
  | 'ALERTING_ONCALL_CAPTURE'
  | 'QUEUE_BACKPRESSURE_CAPTURE'
  | 'INCIDENT_DR_CAPTURE'
  | 'TENANT_EXPORT_CAPTURE';

export interface Pass24OperationsEvidenceJobPayload {
  readonly kind: Pass24OperationsEvidenceJobKind;
  readonly organizationId: string;
  readonly runId: string;
  readonly evidenceOnly: boolean;
  readonly artifactPath: string;
  readonly payloadMarkers?: readonly string[];
}

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
  'tenant.delete',
  'user.permission.escalate',
] as const;

export function assertPass24OperationsEvidenceJob(payload: Pass24OperationsEvidenceJobPayload): void {
  if (!payload.evidenceOnly) {
    throw new Error('PASS24-QUEUE-BACKPRESSURE-GATE: operations evidence workers must be evidence-only.');
  }
  if (!payload.organizationId || !payload.runId || !payload.artifactPath) {
    throw new Error('PASS24-QUEUE-BACKPRESSURE-GATE: operations evidence jobs require organizationId, runId and artifactPath.');
  }
  const markers = payload.payloadMarkers ?? [];
  const forbidden = markers.filter((marker) => forbiddenCriticalMutationMarkers.some((blocked) => marker.includes(blocked)));
  if (forbidden.length > 0) {
    throw new Error(`PASS24-QUEUE-BACKPRESSURE-GATE: operations evidence jobs cannot carry critical mutation payloads: ${forbidden.join(', ')}`);
  }
}

export function pass24ForbiddenWorkerMutationMarkers(): readonly string[] {
  return forbiddenCriticalMutationMarkers;
}
