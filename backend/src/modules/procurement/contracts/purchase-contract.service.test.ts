import { describe, expect, it } from 'vitest';
import {
  CreatePurchaseContractSchema,
  CreatePurchaseReleaseOrderSchema,
  PurchaseContractStatusSchema,
  VendorOnboardingActionSchema,
} from '@nexora/shared';

describe('Pass 15 commercial procurement contracts', () => {
  it('validates purchase contract creation', () => {
    const value = CreatePurchaseContractSchema.parse({
      vendorId: '11111111-1111-4111-8111-111111111111',
      startDate: '2026-09-01',
      endDate: '2027-09-01',
      maxValue: '500000.00',
      items: [{
        productId: '22222222-2222-4222-8222-222222222222',
        agreedRate: '5000.0000',
        maxQuantity: '100',
      }],
    });
    expect(value.items).toHaveLength(1);
  });

  it('validates release orders from approved contracts', () => {
    const value = CreatePurchaseReleaseOrderSchema.parse({
      expectedDate: '2026-10-01',
      items: [{
        contractItemId: '33333333-3333-4333-8333-333333333333',
        quantity: '5.0000',
      }],
    });
    expect(value.items[0].quantity).toBe('5.0000');
  });

  it('preserves implementation-derived purchase contract statuses', () => {
    expect(PurchaseContractStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
  });

  it('blocks high-risk vendor approval at contract level', () => {
    expect(() =>
      VendorOnboardingActionSchema.parse({
        decision: 'APPROVE',
        documentsVerified: true,
        bankVerified: true,
        riskScore: 91,
        riskRating: 'HIGH',
      }),
    ).toThrow();
  });

  it('requires reason for vendor blacklisting', () => {
    expect(() =>
      VendorOnboardingActionSchema.parse({
        decision: 'BLACKLIST',
        riskScore: 100,
        riskRating: 'BLACKLISTED',
      }),
    ).toThrow();
  });
});
