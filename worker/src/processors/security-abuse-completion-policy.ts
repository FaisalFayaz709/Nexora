export const M19_WORKER_SECURITY_ABUSE_COMPLETION_POLICY = 'M19_WORKER_SECURITY_ABUSE_COMPLETION_POLICY' as const;

const M19_FORBIDDEN_WORKER_MUTATION_MARKERS = [
  'stockBalance.update',
  'stockTransaction.create',
  'journalEntry.create',
  'payment.update',
  'approvalRequest.update',
  'purchaseOrder.update',
  'supplierInvoice.update',
  'customerInvoice.update',
  'asset.update',
  'workOrder.update',
  'maintenanceExecution.update',
] as const;

export function assertM19WorkerPayloadCannotMutateCriticalState(payload: unknown): void {
  const serialized = JSON.stringify(payload ?? {});
  const hit = M19_FORBIDDEN_WORKER_MUTATION_MARKERS.find((marker) => serialized.includes(marker));
  if (hit) {
    throw new Error(`M19-NO-SECURITY-BYPASS-IN-FRONTEND-OR-WORKER: worker payload contains forbidden mutation marker ${hit}`);
  }
}

export function m19WorkerSecurityAbusePolicy() {
  return {
    policy: M19_WORKER_SECURITY_ABUSE_COMPLETION_POLICY,
    forbiddenMutationMarkers: M19_FORBIDDEN_WORKER_MUTATION_MARKERS,
    allowedAsyncWork: ['notifications', 'report rendering', 'webhook delivery', 'document expiry reminders'],
    productionBlockedUntilRuntimeCertified: true,
  } as const;
}
