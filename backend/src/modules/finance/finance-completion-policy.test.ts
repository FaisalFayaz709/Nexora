import { describe, expect, it } from 'vitest';
import {
  assertBankReconciliationIsClosable,
  assertFinanceCompletionMatrix,
  assertVoucherFundingAccountExclusive,
  FinanceRuntimeCertificationScenarios,
} from './finance-completion-policy.js';

describe('M10 finance completion policy', () => {
  it('M10-FINANCE-COMPLETION-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    expect(() => assertFinanceCompletionMatrix({
      sourcePreflight: true,
      realThreeWayMatch: true,
      paymentBodyHashIdempotency: true,
      taxSnapshotStored: true,
      bankReconciliationCloseOnce: true,
      noAsyncCriticalMoneyMutation: true,
    })).not.toThrow();
    expect(() => assertFinanceCompletionMatrix({
      sourcePreflight: true,
      realThreeWayMatch: false,
      paymentBodyHashIdempotency: true,
      taxSnapshotStored: true,
      bankReconciliationCloseOnce: true,
      noAsyncCriticalMoneyMutation: true,
    })).toThrow('FINANCE_COMPLETION_MATRIX_INVALID');
  });

  it('M10-VOUCHER-FUNDING-ACCOUNT-EXCLUSIVE', () => {
    expect(() => assertVoucherFundingAccountExclusive({ bankAccountId: 'bank-1' })).not.toThrow();
    expect(() => assertVoucherFundingAccountExclusive({ cashAccountId: 'cash-1' })).not.toThrow();
    expect(() => assertVoucherFundingAccountExclusive({})).toThrow('VOUCHER_FUNDING_ACCOUNT_REQUIRED');
    expect(() => assertVoucherFundingAccountExclusive({ bankAccountId: 'bank-1', cashAccountId: 'cash-1' })).toThrow('VOUCHER_FUNDING_ACCOUNT_EXCLUSIVE');
  });

  it('M10-BANK-RECONCILIATION-CLOSE-IS-IMMUTABLE', () => {
    expect(() => assertBankReconciliationIsClosable('OPEN')).not.toThrow();
    expect(() => assertBankReconciliationIsClosable('IN_PROGRESS')).not.toThrow();
    expect(() => assertBankReconciliationIsClosable('CLOSED')).toThrow('BANK_RECONCILIATION_ALREADY_CLOSED');
  });

  it('M10-RUNTIME-SCENARIO-COVERAGE-LISTED', () => {
    expect(FinanceRuntimeCertificationScenarios).toContain('M10-SUPPLIER-INVOICE-THREE-WAY-MATCH-USES-REAL-PO-GRN-INVOICE-LINES');
    expect(FinanceRuntimeCertificationScenarios).toContain('M10-PAYMENT-IDEMPOTENCY-HASHES-CANONICAL-REQUEST-BODY');
    expect(FinanceRuntimeCertificationScenarios).toContain('M10-TAX-CALCULATION-STORES-AUDITABLE-SNAPSHOT');
    expect(FinanceRuntimeCertificationScenarios).toContain('M10-BANK-RECONCILIATION-CLOSE-IS-IMMUTABLE');
  });
});
