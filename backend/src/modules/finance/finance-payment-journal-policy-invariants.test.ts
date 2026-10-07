import { Prisma } from '@nexora/database';
import { describe, expect, it } from 'vitest';
import {
  assertInvoiceCanReceivePayment,
  assertJournalBalanced,
  assertPaymentAllocationTotal,
  assertPaymentIdempotencyKey,
  financeRequestHash,
  assertIdempotentReplay,
} from './finance-core-policy.js';

describe('PASS M10 finance payment and journal policy invariants', () => {
  it('requires idempotency keys for retry-sensitive payment commands', () => {
    expect(() => assertPaymentIdempotencyKey('payment-key-001')).not.toThrow();
    expect(() => assertPaymentIdempotencyKey('')).toThrow('IDEMPOTENCY_KEY_REQUIRED');
    expect(() => assertPaymentIdempotencyKey(null)).toThrow('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('requires payment allocations to reconcile exactly to the payment amount', () => {
    expect(() =>
      assertPaymentAllocationTotal(new Prisma.Decimal('250.00'), [
        { amount: '100.00' },
        { amount: '150.00' },
      ]),
    ).not.toThrow();
    expect(() => assertPaymentAllocationTotal('250.00', [{ amount: '100.00' }])).toThrow(
      'PAYMENT_ALLOCATION_MISMATCH',
    );
  });

  it('prevents over-allocation beyond an invoice balance', () => {
    expect(() =>
      assertInvoiceCanReceivePayment('CUSTOMER_INVOICE', 'POSTED', '300.00', '125.00'),
    ).not.toThrow();
    expect(() =>
      assertInvoiceCanReceivePayment('SUPPLIER_INVOICE', 'APPROVED', '300.00', '301.00'),
    ).toThrow('PAYMENT_OVER_ALLOCATED');
  });

  it('requires balanced non-zero journal entries before posting', () => {
    expect(() => assertJournalBalanced([{ debit: '500.00' }, { credit: '500.00' }])).not.toThrow();
    expect(() => assertJournalBalanced([{ debit: '500.00' }, { credit: '499.99' }])).toThrow(
      'JOURNAL_ENTRY_UNBALANCED',
    );
    expect(() => assertJournalBalanced([{ debit: '0.00' }, { credit: '0.00' }])).toThrow(
      'JOURNAL_ENTRY_UNBALANCED',
    );
  });

  it('hashes canonical payment bodies for safe idempotent replay', () => {
    const firstHash = financeRequestHash({
      direction: 'INBOUND',
      amount: '250.00',
      allocations: [{ invoiceType: 'CUSTOMER_INVOICE', invoiceId: 'invoice-1', amount: '250.00' }],
    });
    const replayHash = financeRequestHash({
      amount: '250.00',
      allocations: [{ amount: '250.00', invoiceId: 'invoice-1', invoiceType: 'CUSTOMER_INVOICE' }],
      direction: 'INBOUND',
    });
    const changedHash = financeRequestHash({
      direction: 'INBOUND',
      amount: '251.00',
      allocations: [{ invoiceType: 'CUSTOMER_INVOICE', invoiceId: 'invoice-1', amount: '251.00' }],
    });

    expect(firstHash).toBe(replayHash);
    expect(() => assertIdempotentReplay({ requestHash: firstHash, responseJson: { id: 'payment-1' } }, replayHash)).not.toThrow();
    expect(() => assertIdempotentReplay({ requestHash: firstHash, responseJson: { id: 'payment-1' } }, changedHash)).toThrow('IDEMPOTENCY_KEY_REUSED');
  });
});
