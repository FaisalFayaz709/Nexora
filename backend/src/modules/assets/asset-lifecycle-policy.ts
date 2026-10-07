import { AppError } from '../../core/http/errors.js';

export type AssetLifecycleStatus =
  | 'PROCURED'
  | 'IN_WAREHOUSE'
  | 'ALLOCATED'
  | 'ISSUED'
  | 'INSTALLED'
  | 'ACTIVE'
  | 'UNDER_MAINTENANCE'
  | 'REPAIRED'
  | 'REPLACED'
  | 'RETIRED';

export type AssetTrackingType = 'NONE' | 'SERIAL' | 'BATCH';

export const AssetLifecycleTransactionBoundary = {
  registerFromStock:
    'number sequence + serial row lock + asset create + serial asset link + history + warranty + audit in one PostgreSQL transaction',
  install:
    'asset lock + project/site validation + AssetInstallation + serialized stock consumption + asset status/history + QR hash + audit + event in one PostgreSQL transaction',
  replace:
    'old asset lock + replacement asset lock + same placement validation + replaced link + history + audit in one PostgreSQL transaction',
  retire:
    'asset lock + optional ApprovalRequest + terminal status + QR revocation + history + audit in one PostgreSQL transaction',
  rma:
    'approved vendor guard + RMA number + RMA request + asset history + audit in one PostgreSQL transaction',
} as const;

export const AssetLifecycleChecklist = [
  'asset-owned-status-machine',
  'serial-stock-consumption-is-synchronous',
  'qr-token-is-hashed-before-persistence',
  'qr-resolution-requires-authenticated-tenant-context',
  'asset-history-is-append-only',
  'retirement-revokes-active-qr',
  'replacement-preserves-customer-site-project-continuity',
  'warranty-expiry-emits-domain-event',
  'rma-requires-approved-vendor',
  'no-async-asset-stock-status-qr-retirement-or-replacement-state-mutation',
] as const;

const installableStatuses = new Set<AssetLifecycleStatus>([
  'PROCURED',
  'IN_WAREHOUSE',
  'ALLOCATED',
  'ISSUED',
]);

const serviceStatuses = new Set<AssetLifecycleStatus>([
  'ACTIVE',
  'UNDER_MAINTENANCE',
  'REPAIRED',
]);

const terminalStatuses = new Set<AssetLifecycleStatus>(['REPLACED', 'RETIRED']);

export function assertAssetRegistrationFromStock(input: {
  trackingType: AssetTrackingType;
  serialNo?: string | null;
}) {
  if (input.trackingType === 'SERIAL' && !input.serialNo?.trim()) {
    throw new AppError(
      400,
      'ASSET_SERIAL_REGISTRATION_REQUIRED',
      'Serial-tracked assets must be registered from a specific serial number.',
    );
  }
  if (input.trackingType !== 'SERIAL' && input.serialNo?.trim()) {
    throw new AppError(
      409,
      'ASSET_SERIAL_ONLY_FOR_SERIAL_TRACKED_PRODUCT',
      'A serial number can only be bound to a serial-tracked product.',
    );
  }
}

export function assertAssetMutable(status: AssetLifecycleStatus, action: string) {
  if (terminalStatuses.has(status)) {
    throw new AppError(
      409,
      'ASSET_TERMINAL_STATE',
      `${action} is not allowed for replaced or retired assets.`,
      { currentStatus: status },
    );
  }
}

export function assertAssetInstallable(input: {
  status: AssetLifecycleStatus;
  productTrackingType: AssetTrackingType;
  serialNumberId?: string | null;
}) {
  if (!installableStatuses.has(input.status)) {
    throw new AppError(
      409,
      'ASSET_INSTALL_INVALID_STATE',
      'Asset is not in an installable lifecycle state.',
      { currentStatus: input.status },
    );
  }
  if (input.productTrackingType === 'SERIAL' && !input.serialNumberId) {
    throw new AppError(
      409,
      'ASSET_SERIAL_REQUIRED_FOR_INSTALL',
      'Serial-tracked asset must be registered from eligible serialized stock before installation.',
    );
  }
}

export function assertAssetInstallationPlacement(input: {
  assetProjectId: string;
  assetCustomerId: string;
  assetSiteId: string;
  projectId: string;
  projectCustomerId: string;
  siteId: string;
}) {
  if (
    input.assetProjectId !== input.projectId ||
    input.assetCustomerId !== input.projectCustomerId ||
    input.assetSiteId !== input.siteId
  ) {
    throw new AppError(
      409,
      'ASSET_INSTALL_PLACEMENT_MISMATCH',
      'Installation project/site does not match the asset registration.',
    );
  }
}

export function assertAssetReplacementLink(input: {
  oldStatus: AssetLifecycleStatus;
  replacementStatus: AssetLifecycleStatus;
  oldAssetId: string;
  replacementAssetId: string;
  oldCustomerId: string;
  replacementCustomerId: string;
  oldSiteId: string;
  replacementSiteId: string;
  oldProjectId: string;
  replacementProjectId: string;
  oldReplacedByAssetId?: string | null;
}) {
  if (input.oldAssetId === input.replacementAssetId) {
    throw new AppError(400, 'ASSET_REPLACEMENT_SELF', 'An asset cannot replace itself.');
  }
  if (!serviceStatuses.has(input.oldStatus)) {
    throw new AppError(
      409,
      'ASSET_REPLACE_INVALID_STATE',
      'Only an active/service asset can be replaced.',
      { currentStatus: input.oldStatus },
    );
  }
  if (input.replacementStatus !== 'ACTIVE') {
    throw new AppError(
      409,
      'ASSET_REPLACEMENT_NOT_ACTIVE',
      'Replacement asset must already be installed and ACTIVE.',
      { replacementStatus: input.replacementStatus },
    );
  }
  if (
    input.oldCustomerId !== input.replacementCustomerId ||
    input.oldSiteId !== input.replacementSiteId ||
    input.oldProjectId !== input.replacementProjectId
  ) {
    throw new AppError(
      409,
      'ASSET_REPLACEMENT_PLACEMENT_MISMATCH',
      'Replacement asset must belong to the same customer/site/project.',
    );
  }
  if (input.oldReplacedByAssetId) {
    throw new AppError(409, 'ASSET_ALREADY_REPLACED', 'Asset already has a replacement link.');
  }
}

export function assertAssetRetirable(status: AssetLifecycleStatus) {
  if (terminalStatuses.has(status)) {
    throw new AppError(
      409,
      'ASSET_RETIRE_INVALID_STATE',
      'Terminal assets cannot enter retirement workflow.',
      { currentStatus: status },
    );
  }
}

export function assertAssetQrRotatable(status: AssetLifecycleStatus) {
  if (terminalStatuses.has(status)) {
    throw new AppError(
      409,
      'ASSET_QR_TERMINAL_STATE',
      'Replaced or retired asset QR cannot be rotated.',
      { currentStatus: status },
    );
  }
}

export function assertAssetQrResolvable(input: {
  qrTagId?: string | null;
  revokedAt?: Date | null;
  expiresAt?: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (
    !input.qrTagId ||
    input.revokedAt ||
    (input.expiresAt && input.expiresAt.getTime() <= now.getTime())
  ) {
    throw new AppError(
      404,
      'ASSET_QR_INVALID_OR_EXPIRED',
      'Asset QR token is invalid, expired or revoked.',
    );
  }
}

export function assertAssetRmaAllowed(status: AssetLifecycleStatus) {
  if (terminalStatuses.has(status)) {
    throw new AppError(
      409,
      'ASSET_RMA_TERMINAL_STATE',
      'Replaced or retired asset cannot enter an RMA workflow.',
      { currentStatus: status },
    );
  }
}

export function assertWarrantyWindow(startsAt: Date, expiresAt: Date) {
  if (expiresAt < startsAt) {
    throw new AppError(
      400,
      'ASSET_WARRANTY_DATES_INVALID',
      'Warranty expiry cannot precede warranty start date.',
    );
  }
}

export function deriveWarrantyStatus(
  startsAt: Date,
  expiresAt: Date,
  now = new Date(),
  expiringDays = 30,
) {
  assertWarrantyWindow(startsAt, expiresAt);
  const expiryDay = Date.UTC(
    expiresAt.getUTCFullYear(),
    expiresAt.getUTCMonth(),
    expiresAt.getUTCDate(),
  );
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (expiryDay < nowDay) return 'EXPIRED' as const;
  const days = Math.ceil((expiryDay - nowDay) / (24 * 60 * 60 * 1000));
  if (days <= expiringDays) return 'EXPIRING' as const;
  return 'ACTIVE' as const;
}

export function normalizeAssetHistoryEvent(input: {
  eventType: string;
  oldStatus?: AssetLifecycleStatus | null;
  newStatus?: AssetLifecycleStatus | null;
  referenceType?: string | null;
  referenceId?: string | null;
}) {
  if (!input.eventType.trim()) {
    throw new AppError(400, 'ASSET_HISTORY_EVENT_REQUIRED', 'Asset history event type is required.');
  }
  return {
    eventType: input.eventType.trim().toUpperCase(),
    oldStatus: input.oldStatus ?? null,
    newStatus: input.newStatus ?? input.oldStatus ?? null,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
  };
}
