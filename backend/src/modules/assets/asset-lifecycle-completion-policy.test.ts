import { describe, expect, it } from 'vitest';
import {
  AssetLifecycleCompletionControls,
  AssetLifecycleCriticalCommands,
  AssetLifecycleRuntimeCertificationScenarios,
  assertAssetLifecycleCompletionMatrix,
  assertAssetLifecycleTerminalGuard,
  assertQrPersistenceDoesNotLeak,
  assertReplacementQrRevocation,
} from './asset-lifecycle-completion-policy.js';

describe('M12 asset lifecycle and QR completion policy', () => {
  it('M12-ASSET-LIFECYCLE-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    expect(AssetLifecycleCompletionControls).toContain('replacement-revokes-old-asset-qr-in-the-same-transaction-as-status-change');
    expect(AssetLifecycleCriticalCommands).toContain('POST /api/v1/assets/:id/install');
    expect(AssetLifecycleRuntimeCertificationScenarios).toContain('M12-RUNTIME-QR-RESOLVE-DENIES-CROSS-TENANT-TOKEN-USE');
    expect(() => assertAssetLifecycleCompletionMatrix([
      {
        subject: 'ASSET_INSTALLATION_ATOMICITY',
        lockedRoute: 'POST /api/v1/assets/:id/install',
        transactionRequired: true,
        auditRequired: true,
        tenantIsolationRequired: true,
        runtimeScenario: 'M12-RUNTIME-INSTALLATION-CREATES-ASSET-INSTALLATION-HISTORY-AUDIT-EVENT-AND-HASHED-QR',
      },
    ])).not.toThrow();
  });

  it('M12-ASSET-REPLACEMENT-QR-REVOCATION-IS-BLOCKING', () => {
    expect(() => assertReplacementQrRevocation({ oldAssetStatusAfterReplace: 'REPLACED', replacementAssetStatus: 'ACTIVE', activeOldAssetQrCountAfterReplace: 0 })).not.toThrow();
    expect(() => assertReplacementQrRevocation({ oldAssetStatusAfterReplace: 'REPLACED', replacementAssetStatus: 'ACTIVE', activeOldAssetQrCountAfterReplace: 1 })).toThrow('Old asset QR must be revoked');
  });

  it('M12-ASSET-QR-HASH-DOES-NOT-LEAK-RAW-TOKEN', () => {
    expect(() => assertQrPersistenceDoesNotLeak({ rawToken: 'raw-token', persistedTokenHash: 'hashed-token' })).not.toThrow();
    expect(() => assertQrPersistenceDoesNotLeak({ rawToken: 'same', persistedTokenHash: 'same' })).toThrow('Raw QR token must never be persisted');
  });

  it('M12-ASSET-TERMINAL-STATES-BLOCK-MUTATING-COMMANDS', () => {
    expect(() => assertAssetLifecycleTerminalGuard({ status: 'ACTIVE', attemptedCommand: 'install' })).not.toThrow();
    expect(() => assertAssetLifecycleTerminalGuard({ status: 'RETIRED', attemptedCommand: 'history' })).not.toThrow();
    expect(() => assertAssetLifecycleTerminalGuard({ status: 'REPLACED', attemptedCommand: 'install' })).toThrow('Terminal assets');
  });
});
