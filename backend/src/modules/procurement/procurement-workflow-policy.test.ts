import { describe, expect, it } from 'vitest';
import { Prisma } from '@nexora/database';
import {
  assertGoodsReceiptQuantities,
  assertPurchaseOrderCommandAllowed,
  assertPurchaseRequestCanCreateRfq,
  assertReceiptWithinTolerance,
  assertSerializedAcceptedQuantity,
  assertSupplierQuotationCanBeSelected,
  compareSupplierQuotations,
  normalizeInvitedVendorIds,
} from './procurement-workflow-policy.js';

describe('procurement deep workflow policy', () => {
  it('allows RFQ creation only from an approved purchase request', () => {
    expect(assertPurchaseRequestCanCreateRfq('APPROVED')).toBe('APPROVED');
    expect(() => assertPurchaseRequestCanCreateRfq('DRAFT')).toThrow('RFQ requires an APPROVED purchase request');
  });

  it('deduplicates vendor invitations and rejects an empty invite list', () => {
    expect(normalizeInvitedVendorIds([' vendor-a ', 'vendor-b', 'vendor-a'])).toEqual(['vendor-a', 'vendor-b']);
    expect(() => normalizeInvitedVendorIds([' ', ''])).toThrow('At least one vendor');
  });

  it('ranks supplier quotations deterministically by cost delivery warranty and quote reference', () => {
    const results = compareSupplierQuotations([
      { id: 'q2', vendorId: 'v2', quoteRef: 'B', total: new Prisma.Decimal('900'), deliveryDays: [12], warrantyMonths: [24], status: 'SUBMITTED' },
      { id: 'q1', vendorId: 'v1', quoteRef: 'A', total: new Prisma.Decimal('900'), deliveryDays: [7], warrantyMonths: [12], status: 'SUBMITTED' },
      { id: 'q3', vendorId: 'v3', quoteRef: 'C', total: new Prisma.Decimal('950'), deliveryDays: [3], warrantyMonths: [36], status: 'VALID' },
    ]);
    expect(results.map((row) => row.id)).toEqual(['q1', 'q2', 'q3']);
    expect(results[0].isLowestCost).toBe(true);
    expect(results[2].isFastestDelivery).toBe(true);
    expect(results[2].isStrongestWarranty).toBe(true);
  });

  it('requires selected quotation before purchase order creation', () => {
    expect(assertSupplierQuotationCanBeSelected('SUBMITTED')).toBe('SUBMITTED');
    expect(() => assertSupplierQuotationCanBeSelected('REJECTED')).toThrow('Quotation cannot be selected');
  });

  it('enforces purchase order workflow command states and receipt history cancellation guard', () => {
    expect(assertPurchaseOrderCommandAllowed('DRAFT', 'submit')).toBe('DRAFT');
    expect(assertPurchaseOrderCommandAllowed('APPROVAL_PENDING', 'approve')).toBe('APPROVAL_PENDING');
    expect(assertPurchaseOrderCommandAllowed('APPROVED', 'send')).toBe('APPROVED');
    expect(assertPurchaseOrderCommandAllowed('SENT', 'receive')).toBe('SENT');
    expect(() => assertPurchaseOrderCommandAllowed('RECEIVED', 'cancel')).toThrow('PO cannot be cancelled');
    expect(() => assertPurchaseOrderCommandAllowed('APPROVED', 'cancel', { hasReceiptHistory: true })).toThrow('receipt history');
  });

  it('validates GRN line quantities and over-receipt tolerance', () => {
    const qty = assertGoodsReceiptQuantities({ receivedQty: '10', acceptedQty: '9', damagedQty: '1' });
    expect(qty.accepted.toString()).toBe('9');
    expect(assertReceiptWithinTolerance({ orderedQty: '100', alreadyReceivedQty: '90', incomingReceivedQty: '10', tolerancePct: '0' }).toString()).toBe('100');
    expect(() => assertReceiptWithinTolerance({ orderedQty: '100', alreadyReceivedQty: '90', incomingReceivedQty: '11', tolerancePct: '0' })).toThrow('exceeds PO quantity');
  });

  it('requires accepted serialized quantity to equal unique serial count', () => {
    expect(assertSerializedAcceptedQuantity({ trackingType: 'SERIAL', acceptedQty: '2', serialNumbers: ['S1', 'S2'] })).toEqual(['S1', 'S2']);
    expect(() => assertSerializedAcceptedQuantity({ trackingType: 'SERIAL', acceptedQty: '2', serialNumbers: ['S1', 'S1'] })).toThrow('serial count');
  });
});
