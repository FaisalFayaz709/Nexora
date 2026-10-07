import { describe, expect, it } from 'vitest';
import {
  AssetStatusSchema,
  AssetWarrantyStatusSchema,
  InstallAssetSchema,
  RegisterAssetFromStockSchema,
} from '@nexora/shared';

describe('Asset contracts', () => {
  it('preserves the canonical asset lifecycle statuses', () => {
    for (const status of [
      'PROCURED',
      'IN_WAREHOUSE',
      'ALLOCATED',
      'ISSUED',
      'INSTALLED',
      'ACTIVE',
      'UNDER_MAINTENANCE',
      'REPAIRED',
      'REPLACED',
      'RETIRED',
    ]) {
      expect(AssetStatusSchema.parse(status)).toBe(status);
    }
  });

  it('preserves warranty statuses', () => {
    for (const status of ['ACTIVE','EXPIRING','EXPIRED','VOID']) {
      expect(AssetWarrantyStatusSchema.parse(status)).toBe(status);
    }
  });

  it('preserves the source install request shape', () => {
    const value = InstallAssetSchema.parse({
      siteId: '11111111-1111-4111-8111-111111111111',
      areaId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      technicianId: '44444444-4444-4444-8444-444444444444',
      installedAt: '2026-09-20T11:10:00Z',
      locationText: 'Building A - Floor 2 - Corridor',
    });
    expect(value.locationText).toContain('Floor 2');
  });

  it('requires serial number for stock registration', () => {
    expect(() =>
      RegisterAssetFromStockSchema.parse({
        customerId: '11111111-1111-4111-8111-111111111111',
        siteId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
      }),
    ).toThrow();
  });
});
