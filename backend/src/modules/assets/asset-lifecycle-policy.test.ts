import { describe, expect, it } from 'vitest';
import {
  AssetLifecycleChecklist,
  AssetLifecycleTransactionBoundary,
  assertAssetInstallable,
  assertAssetInstallationPlacement,
  assertAssetQrResolvable,
  assertAssetQrRotatable,
  assertAssetRegistrationFromStock,
  assertAssetReplacementLink,
  assertAssetRetirable,
  assertAssetRmaAllowed,
  deriveWarrantyStatus,
  normalizeAssetHistoryEvent,
} from './asset-lifecycle-policy.js';

describe('C7 asset lifecycle policy', () => {
  it('requires serialized products to register through stock serials', () => {
    expect(() => assertAssetRegistrationFromStock({ trackingType: 'SERIAL' })).toThrow('Serial-tracked assets');
    expect(() => assertAssetRegistrationFromStock({ trackingType: 'NONE', serialNo: 'SN-1' })).toThrow('serial-tracked product');
    expect(() => assertAssetRegistrationFromStock({ trackingType: 'SERIAL', serialNo: 'SN-1' })).not.toThrow();
  });

  it('guards installation state and placement continuity', () => {
    expect(() => assertAssetInstallable({ status: 'ACTIVE', productTrackingType: 'NONE' })).toThrow('installable lifecycle state');
    expect(() => assertAssetInstallable({ status: 'IN_WAREHOUSE', productTrackingType: 'SERIAL' })).toThrow('Serial-tracked asset');
    expect(() => assertAssetInstallable({ status: 'IN_WAREHOUSE', productTrackingType: 'SERIAL', serialNumberId: 'serial-1' })).not.toThrow();
    expect(() => assertAssetInstallationPlacement({ assetProjectId: 'p1', assetCustomerId: 'c1', assetSiteId: 's1', projectId: 'p1', projectCustomerId: 'c1', siteId: 's2' })).toThrow('project/site');
  });

  it('requires replacement to preserve customer site and project', () => {
    expect(() => assertAssetReplacementLink({ oldStatus: 'ACTIVE', replacementStatus: 'ACTIVE', oldAssetId: 'old', replacementAssetId: 'new', oldCustomerId: 'c', replacementCustomerId: 'c', oldSiteId: 's', replacementSiteId: 's', oldProjectId: 'p', replacementProjectId: 'p' })).not.toThrow();
    expect(() => assertAssetReplacementLink({ oldStatus: 'ACTIVE', replacementStatus: 'ACTIVE', oldAssetId: 'old', replacementAssetId: 'new', oldCustomerId: 'c', replacementCustomerId: 'x', oldSiteId: 's', replacementSiteId: 's', oldProjectId: 'p', replacementProjectId: 'p' })).toThrow('same customer/site/project');
  });

  it('guards QR resolution, QR rotation, RMA and retirement terminal states', () => {
    expect(() => assertAssetQrRotatable('RETIRED')).toThrow('Retired asset QR');
    expect(() => assertAssetQrResolvable({ qrTagId: 'qr', revokedAt: new Date() })).toThrow('invalid, expired or revoked');
    expect(() => assertAssetQrResolvable({ qrTagId: 'qr', expiresAt: new Date(Date.now() + 60000) })).not.toThrow();
    expect(() => assertAssetRmaAllowed('RETIRED')).toThrow('RMA workflow');
    expect(() => assertAssetRetirable('REPLACED')).toThrow('Terminal assets');
  });

  it('derives warranty status and normalizes append-only history events', () => {
    expect(deriveWarrantyStatus(new Date('2026-01-01'), new Date('2026-01-20'), new Date('2026-01-01'), 30)).toBe('EXPIRING');
    expect(deriveWarrantyStatus(new Date('2026-01-01'), new Date('2026-12-31'), new Date('2026-01-01'), 30)).toBe('ACTIVE');
    expect(deriveWarrantyStatus(new Date('2026-01-01'), new Date('2026-01-02'), new Date('2026-01-03'), 30)).toBe('EXPIRED');
    expect(normalizeAssetHistoryEvent({ eventType: ' installed ', oldStatus: 'ISSUED', newStatus: 'ACTIVE' }).eventType).toBe('INSTALLED');
  });

  it('declares locked C7 synchronous transaction boundaries', () => {
    expect(AssetLifecycleTransactionBoundary.install).toContain('one PostgreSQL transaction');
    expect(AssetLifecycleChecklist).toContain('no-async-asset-stock-status-qr-retirement-or-replacement-state-mutation');
  });
});
