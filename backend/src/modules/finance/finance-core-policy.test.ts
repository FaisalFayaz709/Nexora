import { Prisma } from '@nexora/database';
import { describe, expect, it } from 'vitest';
import {
  assertCanonicalInvoiceStatus,
  assertCustomerInvoiceCanPost,
  assertInvoiceCanReceivePayment,
  assertJournalBalanced,
  assertNoAsyncFinanceCriticalMutation,
  assertPaymentAllocationTotal,
  assertPaymentIdempotencyKey,
  assertPostedLedgerIsReversalOnly,
  assertSupplierInvoiceCanApprove,
  assertSupplierInvoiceMatchStatusSeparateFromStatus,
  calculateSupplierInvoiceThreeWayMatch,
  calculateThreeWayMatchStatus,
  financeRequestHash,
  assertIdempotentReplay,
} from './finance-core-policy.js';

describe('C10 finance core policy', () => {
  it('C10-FINANCE-CANONICAL-INVOICE-STATUS-MODEL', () => {
    expect(() => assertCanonicalInvoiceStatus('APPROVED')).not.toThrow();
    expect(() => assertCanonicalInvoiceStatus('MATCHED')).toThrow('FINANCE_NON_CANONICAL_INVOICE_STATUS');
  });

  it('C10-SUPPLIER-INVOICE-MATCH-STATUS-SEPARATE-FROM-STATUS', () => {
    expect(() => assertSupplierInvoiceMatchStatusSeparateFromStatus('DRAFT', 'MATCHED')).not.toThrow();
    expect(() => assertSupplierInvoiceMatchStatusSeparateFromStatus('MATCHED', 'MATCHED')).toThrow('FINANCE_NON_CANONICAL_INVOICE_STATUS');
  });

  it('C10-CUSTOMER-INVOICE-POST-ONLY-APPROVED', () => {
    expect(() => assertCustomerInvoiceCanPost('APPROVED')).not.toThrow();
    expect(() => assertCustomerInvoiceCanPost('DRAFT')).toThrow('CUSTOMER_INVOICE_POST_INVALID_STATE');
  });

  it('C10-SUPPLIER-INVOICE-THREE-WAY-MATCH-DECISION', () => {
    expect(calculateThreeWayMatchStatus([{ poItemId: 'po-line-1', orderedQty: '10', receivedAcceptedQty: '10', invoicedQty: '10', poUnitPrice: '100', invoiceUnitPrice: '100' }]).matchStatus).toBe('MATCHED');
    expect(calculateThreeWayMatchStatus([{ poItemId: 'po-line-1', orderedQty: '10', receivedAcceptedQty: '8', invoicedQty: '10', poUnitPrice: '100', invoiceUnitPrice: '100' }]).matchStatus).toBe('VARIANCE');
    expect(calculateThreeWayMatchStatus([{ poItemId: null, orderedQty: '10', receivedAcceptedQty: '10', invoicedQty: '10', poUnitPrice: '100', invoiceUnitPrice: '100' }]).matchStatus).toBe('BLOCKED');
  });

  it('C10-SUPPLIER-INVOICE-APPROVAL-REQUIRES-MATCHED-MATCHSTATUS', () => {
    expect(() => assertSupplierInvoiceCanApprove('DRAFT', 'MATCHED')).not.toThrow();
    expect(() => assertSupplierInvoiceCanApprove('DRAFT', 'VARIANCE')).toThrow('SUPPLIER_INVOICE_APPROVE_INVALID_MATCH');
  });

  it('C10-PAYMENT-IDEMPOTENCY-AND-ALLOCATION-TOTAL', () => {
    expect(() => assertPaymentIdempotencyKey('pay-key-1')).not.toThrow();
    expect(() => assertPaymentIdempotencyKey('')).toThrow('IDEMPOTENCY_KEY_REQUIRED');
    expect(() => assertPaymentAllocationTotal(new Prisma.Decimal('100'), [{ amount: '60' }, { amount: '40' }])).not.toThrow();
    expect(() => assertPaymentAllocationTotal('100', [{ amount: '60' }])).toThrow('PAYMENT_ALLOCATION_MISMATCH');
  });

  it('C10-PAYMENT-BALANCE-AND-PAYABLE-STATUS', () => {
    expect(() => assertInvoiceCanReceivePayment('CUSTOMER_INVOICE', 'POSTED', '100', '50')).not.toThrow();
    expect(() => assertInvoiceCanReceivePayment('CUSTOMER_INVOICE', 'DRAFT', '100', '50')).toThrow('PAYMENT_CUSTOMER_INVOICE_INVALID');
    expect(() => assertInvoiceCanReceivePayment('SUPPLIER_INVOICE', 'APPROVED', '100', '150')).toThrow('PAYMENT_OVER_ALLOCATED');
  });

  it('C10-JOURNAL-BALANCED-AND-REVERSAL-ONLY', () => {
    expect(() => assertJournalBalanced([{ debit: '100' }, { credit: '100' }])).not.toThrow();
    expect(() => assertJournalBalanced([{ debit: '100' }, { credit: '90' }])).toThrow('JOURNAL_ENTRY_UNBALANCED');
    expect(() => assertPostedLedgerIsReversalOnly('POSTED', 'reverse')).not.toThrow();
    expect(() => assertPostedLedgerIsReversalOnly('POSTED', 'edit')).toThrow('POSTED_LEDGER_REVERSAL_REQUIRED');
  });

  it('C10-FINANCE-NO-ASYNC-CRITICAL-MUTATION', () => {
    expect(() => assertNoAsyncFinanceCriticalMutation('report.export')).not.toThrow();
    expect(() => assertNoAsyncFinanceCriticalMutation('payment-post-from-worker')).toThrow('FINANCE_ASYNC_CRITICAL_MUTATION_FORBIDDEN');
  });

  it('M10-SUPPLIER-INVOICE-THREE-WAY-MATCH-USES-REAL-PO-GRN-INVOICE-LINES', () => {
    const decision = calculateSupplierInvoiceThreeWayMatch(
      [{ poItemId: 'po-item-1', qty: '2', unitPrice: '50' }],
      [{ poItemId: 'po-item-1', productId: 'product-1', orderedQty: '5', receivedAcceptedQty: '2', damagedQty: '0', poUnitPrice: '50' }],
    );
    expect(decision.matchStatus).toBe('MATCHED');
    expect(calculateSupplierInvoiceThreeWayMatch(
      [{ poItemId: 'po-item-1', qty: '3', unitPrice: '55' }],
      [{ poItemId: 'po-item-1', productId: 'product-1', orderedQty: '5', receivedAcceptedQty: '2', damagedQty: '0', poUnitPrice: '50' }],
    ).matchStatus).toBe('VARIANCE');
  });

  it('M10-PAYMENT-IDEMPOTENCY-HASHES-CANONICAL-REQUEST-BODY', () => {
    const left = financeRequestHash({ amount: '100.00', allocations: [{ invoiceId: 'a', amount: '100.00' }] });
    const right = financeRequestHash({ allocations: [{ amount: '100.00', invoiceId: 'a' }], amount: '100.00' });
    const changed = financeRequestHash({ amount: '90.00', allocations: [{ invoiceId: 'a', amount: '90.00' }] });
    expect(left).toBe(right);
    expect(left).not.toBe(changed);
    expect(() => assertIdempotentReplay({ requestHash: left, responseJson: { id: 'payment-1' } }, right)).not.toThrow();
    expect(() => assertIdempotentReplay({ requestHash: left, responseJson: { id: 'payment-1' } }, changed)).toThrow('IDEMPOTENCY_KEY_REUSED');
  });

});
