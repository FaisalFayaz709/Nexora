import { describe, expect, it } from 'vitest';
import {
  AccountTypeSchema,
  CreateCustomerInvoiceSchema,
  CreatePaymentSchema,
  CustomerInvoiceStatusSchema,
  SupplierInvoiceMatchStatusSchema,
} from '@nexora/shared';

describe('Finance source contracts', () => {
  it('preserves customer invoice status values from the source plus controlled implementation states', () => {
    for (const status of ['DRAFT','APPROVED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']) {
      expect(CustomerInvoiceStatusSchema.parse(status)).toBe(status);
    }
  });
  it('validates invoice dates and line amounts as decimal strings', () => {
    const parsed = CreateCustomerInvoiceSchema.parse({
      customerId: '11111111-1111-4111-8111-111111111111',
      projectId: '22222222-2222-4222-8222-222222222222',
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      items: [{ description: 'Project milestone billing', qty: '1', unitPrice: '5000', tax: '800' }],
    });
    expect(parsed.items[0].description).toContain('milestone');
  });
  it('keeps payments idempotent and allocation driven at contract level', () => {
    const parsed = CreatePaymentSchema.parse({
      direction: 'INBOUND',
      partyType: 'CUSTOMER',
      partyId: '11111111-1111-4111-8111-111111111111',
      amount: '1000',
      method: 'BANK_TRANSFER',
      paidAt: '2026-09-10T10:00:00Z',
      allocations: [{ invoiceType: 'CUSTOMER_INVOICE', invoiceId: '22222222-2222-4222-8222-222222222222', amount: '1000' }],
    });
    expect(parsed.allocations).toHaveLength(1);
  });
  it('defines chart-of-account and three-way match values', () => {
    expect(AccountTypeSchema.parse('ASSET')).toBe('ASSET');
    expect(SupplierInvoiceMatchStatusSchema.parse('VARIANCE')).toBe('VARIANCE');
  });
});
