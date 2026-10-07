import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/http/errors.js';
import {
  assertAssetInstallable,
  assertAssetRegistrationFromStock,
} from './asset-lifecycle-policy.js';

function expectAppErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error(`Expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('Asset lifecycle locked policy invariants', () => {
  it('blocks direct registration of serial-tracked assets without a locked stock serial', () => {
    expectAppErrorCode(
      () => assertAssetRegistrationFromStock({ trackingType: 'SERIAL', serialNo: null }),
      'ASSET_SERIAL_REGISTRATION_REQUIRED',
    );
  });

  it('blocks installation from non-installable asset lifecycle states', () => {
    expectAppErrorCode(
      () => assertAssetInstallable({ status: 'ACTIVE', productTrackingType: 'NONE' }),
      'ASSET_INSTALL_INVALID_STATE',
    );
  });

  it('requires serial-tracked assets to be registered from stock before installation', () => {
    expectAppErrorCode(
      () => assertAssetInstallable({ status: 'IN_WAREHOUSE', productTrackingType: 'SERIAL', serialNumberId: null }),
      'ASSET_SERIAL_REQUIRED_FOR_INSTALL',
    );
  });
});
