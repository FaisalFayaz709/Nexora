import { describe, expect, it } from 'vitest';
import {
  AllocateLandedCostSchema,
  CreateLandedCostSchema,
  CreateTaxRuleSchema,
  ImportBankStatementSchema,
  PaymentVoucherSchema,
  ReceiptVoucherSchema,
  TaxCalculateSchema,
} from '@nexora/shared';

describe('Commercial Finance contracts', () => {
  it('accepts Appendix-F landed cost creation', () => {
    const value = CreateLandedCostSchema.parse({
      purchaseOrderId: '11111111-1111-4111-8111-111111111111',
      goodsReceiptId: '22222222-2222-4222-8222-222222222222',
      allocationMethod: 'VALUE',
      lines: [{ costType: 'FREIGHT', description: 'Import freight', amount: '15000.00' }],
    });
    expect(value.allocationMethod).toBe('VALUE');
  });

  it('requires landed cost allocations to reconcile later in service', () => {
    const value = AllocateLandedCostSchema.parse({
      allocations: [{
        goodsReceiptItemId: '11111111-1111-4111-8111-111111111111',
        productId: '22222222-2222-4222-8222-222222222222',
        warehouseId: '33333333-3333-4333-8333-333333333333',
        quantity: '10.0000',
        allocatedAmount: '500.00',
      }],
    });
    expect(value.allocations).toHaveLength(1);
  });

  it('validates deterministic tax calculation input', () => {
    expect(TaxCalculateSchema.parse({
      transactionDate: '2026-09-05',
      lines: [{ taxCodeId: '11111111-1111-4111-8111-111111111111', unitPrice: '100.00' }],
    }).sourceType).toBe('PREVIEW');
  });

  it('validates tax rule setup', () => {
    expect(CreateTaxRuleSchema.parse({
      taxCodeName: 'Sales Tax 18%',
      taxCode: 'ST18',
      taxType: 'SALES',
      ratePct: '18',
      effectiveFrom: '2026-01-01',
    }).taxCode).toBe('ST18');
  });

  it('validates bank statement import', () => {
    const value = ImportBankStatementSchema.parse({
      bankAccountId: '11111111-1111-4111-8111-111111111111',
      statementNo: 'SEP-2026',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1400.00',
      lines: [{ occurredAt: '2026-09-05', description: 'Vendor payment', debit: '100.00', credit: '0' }],
    });
    expect(value.lines).toHaveLength(1);
  });

  it('requires a payment voucher to use exactly bank or cash account', () => {
    expect(() =>
      PaymentVoucherSchema.parse({
        payeeType: 'VENDOR',
        amount: '1000.00',
        method: 'CASH',
        voucherDate: '2026-09-05T10:00:00Z',
      }),
    ).toThrow();
  });

  it('validates receipt voucher payer traceability and funding exclusivity', () => {
    const value = ReceiptVoucherSchema.parse({
      cashAccountId: '11111111-1111-4111-8111-111111111111',
      payerType: 'CUSTOMER',
      amount: '2500.00',
      method: 'CASH',
      voucherDate: '2026-09-05T10:00:00Z',
      referenceNo: 'RV-REF-001',
    });
    expect(value.payerType).toBe('CUSTOMER');
  });
});
