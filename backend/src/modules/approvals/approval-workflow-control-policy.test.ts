import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/http/errors.js';
import {
  Pass16FraudControlRules,
  assertFraudControlResult,
  assertPass16WorkflowSubject,
  assertWorkflowRuleDefinition,
  decideWorkflowControl,
  pass16ApprovalWorkflowControlChecklist,
} from './approval-workflow-control-policy.js';

function expectAppErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error(`Expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('PASS 16 approval workflow, maker-checker and fraud-control policy', () => {
  it('governs all high-risk subjects required by the blueprint completion pass', () => {
    const checklist = pass16ApprovalWorkflowControlChecklist();
    expect(checklist.governedSubjects).toEqual(expect.arrayContaining([
      'PurchaseRequest',
      'PurchaseOrder',
      'StockAdjustment',
      'StockCountVariance',
      'VendorOnboardingRequest',
      'CustomerInvoice',
      'SupplierInvoice',
      'Expense',
      'Payment',
      'BankReconciliation',
      'PaymentVoucher',
      'ReceiptVoucher',
      'AssetDisposal',
    ]));
  });

  it('requires approval-producing rule actions to name an approval subject type', () => {
    expectAppErrorCode(
      () => assertWorkflowRuleDefinition({
        triggerType: 'payment.create',
        subjectType: 'Payment',
        condition: { all: [{ field: 'amount', operator: 'GT', value: 250000 }] },
        actions: [{ effect: 'REQUIRE_SECONDARY_APPROVAL' }],
      }),
      'WORKFLOW_RULE_APPROVAL_SUBJECT_REQUIRED',
    );
  });

  it('selects the safest decision when multiple rule actions match', () => {
    expect(decideWorkflowControl([
      { effect: 'NOTIFY', message: 'FYI' },
      { effect: 'REQUIRE_APPROVAL', approvalSubjectType: 'PurchaseOrder' },
    ])).toBe('REQUIRE_APPROVAL');
    expect(decideWorkflowControl([
      { effect: 'REQUIRE_APPROVAL', approvalSubjectType: 'SupplierInvoice' },
      { effect: 'BLOCK', message: 'Invoice exceeds PO amount' },
    ])).toBe('BLOCK');
  });

  it('locks the fraud/control rules that cannot degrade to allow', () => {
    expect(() => assertFraudControlResult({
      controlId: Pass16FraudControlRules.supplierInvoiceOverPoAmount,
      decision: 'BLOCK',
      subjectType: 'SupplierInvoice',
    })).not.toThrow();

    expectAppErrorCode(
      () => assertFraudControlResult({
        controlId: Pass16FraudControlRules.sameUserVendorAndPayment,
        decision: 'ALLOW',
        subjectType: 'Payment',
      }),
      'FRAUD_CONTROL_MUST_REQUIRE_SECONDARY_APPROVAL',
    );
  });

  it('rejects unregistered subject types instead of creating ad hoc workflows', () => {
    expectAppErrorCode(
      () => assertPass16WorkflowSubject('RandomEntity'),
      'WORKFLOW_SUBJECT_TYPE_NOT_GOVERNED',
    );
  });
});
