import { AppError } from '../../core/http/errors.js';

export const AssetLifecycleCompletionControls = [
  'authenticated-tenant-context-required-for-qr-resolution',
  'serial-stock-to-asset-registration-uses-inventory-facade',
  'installation-consumes-serialized-stock-and-activates-asset-in-one-transaction',
  'replacement-revokes-old-asset-qr-in-the-same-transaction-as-status-change',
  'retirement-revokes-qr-and-captures-approval-reference-when-required',
  'rma-requires-approved-vendor-and-does-not-mutate-stock-or-finance-asynchronously',
  'warranty-status-is-derived-from-stored-start-expiry-window',
  'asset-history-is-append-only-and-not-used-as-editable-state',
  'asset-cost-changes-capture-before-after-snapshots',
] as const;

export const AssetLifecycleCriticalCommands = [
  'POST /api/v1/assets/register-from-stock',
  'POST /api/v1/assets/:id/install',
  'POST /api/v1/assets/:id/replace',
  'POST /api/v1/assets/:id/retire',
  'POST /api/v1/assets/:id/qr/rotate',
  'POST /api/v1/assets/:id/rma',
] as const;

export const AssetLifecycleCriticalTables = [
  'Asset',
  'AssetInstallation',
  'AssetHistory',
  'AssetWarranty',
  'AssetQrTag',
  'AssetRMA',
  'SerialNumber',
  'StockTransaction',
  'AuditLog',
  'BusinessEvent',
] as const;

export const AssetLifecycleRuntimeCertificationScenarios = [
  'M12-RUNTIME-SERIAL-STOCK-REGISTER-INSTALL-CONSUME-SERIAL-AND-ACTIVATE-ASSET',
  'M12-RUNTIME-INSTALLATION-CREATES-ASSET-INSTALLATION-HISTORY-AUDIT-EVENT-AND-HASHED-QR',
  'M12-RUNTIME-QR-ROTATE-DOES-NOT-LEAK-PERSISTED-HASH-AND-OLD-TOKEN-FAILS',
  'M12-RUNTIME-QR-RESOLVE-DENIES-CROSS-TENANT-TOKEN-USE',
  'M12-RUNTIME-REPLACEMENT-REVOKES-OLD-ASSET-QR-AND-LINKS-REPLACEMENT-ASSET',
  'M12-RUNTIME-RETIREMENT-REVOKES-QR-AND-BLOCKS-FURTHER-INSTALL-REPLACE-RMA',
  'M12-RUNTIME-RMA-BLOCKS-BLACKLISTED-OR-UNAPPROVED-VENDOR',
  'M12-RUNTIME-WARRANTY-EXPIRY-SCAN-EMITS-ASSET-WARRANTY-EXPIRING-EVENT',
  'M12-RUNTIME-FIELD-SERVICE-AND-MAINTENANCE-APPEND-ASSET-HISTORY',
  'M12-RUNTIME-ASSET-COST-HISTORY-FEEDS-PROJECT-COSTING-READ-MODEL',
] as const;

export function assertAssetLifecycleCompletionMatrix(rows: Array<{
  subject: string;
  lockedRoute: string;
  transactionRequired: boolean;
  auditRequired: boolean;
  tenantIsolationRequired: boolean;
  runtimeScenario: string;
}>) {
  if (!rows.length) {
    throw new AppError(500, 'ASSET_LIFECYCLE_COMPLETION_MATRIX_EMPTY', 'Asset completion matrix cannot be empty.');
  }
  for (const row of rows) {
    if (!row.lockedRoute.includes('/api/v1/')) {
      throw new AppError(500, 'ASSET_LIFECYCLE_ROUTE_NOT_LOCKED', 'Asset completion row must reference a locked /api/v1 route.', { subject: row.subject });
    }
    if (!row.transactionRequired || !row.auditRequired || !row.tenantIsolationRequired) {
      throw new AppError(500, 'ASSET_LIFECYCLE_CONTROL_MISSING', 'Asset completion row is missing transaction, audit or tenant isolation control.', { subject: row.subject });
    }
    if (!row.runtimeScenario.startsWith('M12-RUNTIME-')) {
      throw new AppError(500, 'ASSET_LIFECYCLE_RUNTIME_SCENARIO_MISSING', 'Asset completion row must map to an M12 runtime scenario.', { subject: row.subject });
    }
  }
}

export function assertReplacementQrRevocation(input: {
  oldAssetStatusAfterReplace: string;
  replacementAssetStatus: string;
  activeOldAssetQrCountAfterReplace: number;
}) {
  if (input.oldAssetStatusAfterReplace !== 'REPLACED') {
    throw new AppError(409, 'ASSET_REPLACEMENT_STATUS_NOT_TERMINAL', 'Replaced asset must move to REPLACED status.');
  }
  if (input.replacementAssetStatus !== 'ACTIVE') {
    throw new AppError(409, 'ASSET_REPLACEMENT_TARGET_NOT_ACTIVE', 'Replacement asset must remain ACTIVE.');
  }
  if (input.activeOldAssetQrCountAfterReplace !== 0) {
    throw new AppError(409, 'ASSET_REPLACEMENT_QR_NOT_REVOKED', 'Old asset QR must be revoked when asset is replaced.');
  }
}

export function assertQrPersistenceDoesNotLeak(input: {
  rawToken?: string | null;
  persistedTokenHash?: string | null;
}) {
  if (!input.rawToken?.trim()) {
    throw new AppError(500, 'ASSET_QR_RAW_TOKEN_REQUIRED_ON_ROTATION', 'QR rotation must return the raw token exactly once.');
  }
  if (!input.persistedTokenHash?.trim()) {
    throw new AppError(500, 'ASSET_QR_HASH_REQUIRED', 'QR persistence must store a token hash.');
  }
  if (input.persistedTokenHash === input.rawToken) {
    throw new AppError(500, 'ASSET_QR_RAW_TOKEN_PERSISTED', 'Raw QR token must never be persisted.');
  }
}

export function assertAssetLifecycleTerminalGuard(input: {
  status: string;
  attemptedCommand: string;
}) {
  if ((input.status === 'RETIRED' || input.status === 'REPLACED') && input.attemptedCommand !== 'history') {
    throw new AppError(409, 'ASSET_TERMINAL_COMMAND_BLOCKED', 'Terminal assets can only be inspected, not mutated.', input);
  }
}
