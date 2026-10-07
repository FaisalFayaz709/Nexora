export const M17_PORTAL_OFFLINE_SYNC_WORKER_POLICY = 'M17_PORTAL_OFFLINE_SYNC_WORKER_POLICY' as const;

const forbiddenCriticalMutationKeys = [
  'stockTransaction',
  'stockBalance',
  'serialStatus',
  'paymentPosting',
  'invoiceBalance',
  'journalEntry',
  'approvalState',
  'purchaseOrderStatus',
  'goodsReceiptStatus',
  'workOrderStatus',
  'assetHistory',
  'assetLifecycleStatus',
] as const;

export interface PortalOfflineSyncDeliveryJob {
  readonly organizationId: string;
  readonly batchId: string;
  readonly technicianUserId: string;
  readonly deviceId: string;
  readonly idempotencyKey: string;
  readonly portalActivityLogId?: string;
  readonly notificationOnly?: boolean;
  readonly [key: string]: unknown;
}

export function assertM17PortalOfflineWorkerNotificationOnly(job: PortalOfflineSyncDeliveryJob): void {
  if (!job.organizationId || !job.batchId || !job.technicianUserId || !job.deviceId || !job.idempotencyKey) {
    throw new Error('M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE violation: offline worker job requires tenant, batch, technician, device and idempotency key.');
  }
  for (const key of forbiddenCriticalMutationKeys) {
    if (Object.prototype.hasOwnProperty.call(job, key)) {
      throw new Error('M17-NO-ASYNC-CRITICAL-MUTATION violation: offline worker jobs may deliver notifications only after transactional replay; they cannot mutate critical state.');
    }
  }
}
