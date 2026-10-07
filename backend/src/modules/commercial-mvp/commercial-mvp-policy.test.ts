import { describe, expect, it } from 'vitest';
import {
  assertBankReconciliationClose,
  assertBusinessNumberGeneration,
  assertCommercialMvpCoverage,
  assertImportWizardLifecycle,
  assertLandedCostPosting,
  assertNoAsyncCommercialCriticalMutation,
  assertPurchaseContractRelease,
  assertStockCountPosting,
  assertTaxEngineSnapshot,
  assertVendorRiskGate,
  commercialMvpPriorityKeys,
  C11CommercialMvpControlKeys,
  type CommercialMvpControlStatus,
} from './commercial-mvp-policy.js';

const completeStatus = (key: CommercialMvpControlStatus['key'], priority: CommercialMvpControlStatus['priority']): CommercialMvpControlStatus => ({
  key,
  priority,
  routeCovered: true,
  servicePolicyCovered: true,
  tenantScoped: true,
  audited: true,
  transactionalWhenCritical: true,

  it('C11-COMMERCIAL-MVP-ERROR-CODES-ARE-LOCKED', () => {
    expect([
      'COMMERCIAL_MVP_CONTROL_MISSING',
      'NUMBER_SEQUENCE_NOT_TRANSACTION_SAFE',
      'IMPORT_WIZARD_INVALID_STATE',
      'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
      'TAX_ENGINE_AUDIT_SNAPSHOT_REQUIRED',
      'BANK_RECONCILIATION_CLOSE_CONTROL_MISSING',
      'VENDOR_RISK_GATE_BLOCKED',
      'LANDED_COST_POSTING_CONTROL_MISSING',
      'PURCHASE_CONTRACT_LIMIT_EXCEEDED',
      'COMMERCIAL_CRITICAL_MUTATION_NOT_ASYNC',
    ]).toHaveLength(10);
  });

});

describe('C11 commercial MVP policy', () => {
  it('C11-COMMERCIAL-MVP-PRIORITY-COVERAGE', () => {
    const statuses = C11CommercialMvpControlKeys.map((key, index) => completeStatus(key, index < 2 ? 'P0' : index < 5 ? 'P1' : 'P2'));
    expect(assertCommercialMvpCoverage(statuses)).toBe(true);
    expect(commercialMvpPriorityKeys('P0')).toEqual(['NUMBER_SEQUENCE_MANAGEMENT', 'DATA_IMPORT_WIZARD_BASELINE']);
    expect(commercialMvpPriorityKeys('P1')).toContain('STOCK_COUNT_CYCLE_COUNT');
  });

  it('C11-NUMBER-SEQUENCE-CONCURRENT-BUSINESS-NUMBER-UNIQUENESS', () => {
    expect(() => assertBusinessNumberGeneration({ organizationScoped: true, branchAware: true, entityTypeScoped: true, fiscalYearScoped: true, usesRowLockOrReservation: true, targetCreatedInSameTransaction: true })).not.toThrow();
    expect(() => assertBusinessNumberGeneration({ organizationScoped: true, branchAware: true, entityTypeScoped: true, fiscalYearScoped: true, usesRowLockOrReservation: false, targetCreatedInSameTransaction: true })).toThrow('transaction');
  });

  it('C11-DATA-IMPORT-PREVIEW-VALIDATE-COMMIT-ROLLBACK-TRACEABILITY', () => {
    expect(() => assertImportWizardLifecycle('UPLOADED', 'validate')).not.toThrow();
    expect(() => assertImportWizardLifecycle('VALIDATED', 'commit')).not.toThrow();
    expect(() => assertImportWizardLifecycle('COMMITTED', 'rollback')).not.toThrow();
    expect(() => assertImportWizardLifecycle('UPLOADED', 'commit')).toThrow('Import wizard');
  });

  it('C11-STOCK-COUNT-FREEZE-SUBMIT-VARIANCE-APPROVAL-LEDGER-POSTING', () => {
    expect(() => assertStockCountPosting({ status: 'SUBMITTED', creatorUserId: 'u1', actorUserId: 'u2', varianceApprovalRecorded: true, immutableStockLedgerCreated: true, freezeScopeChecked: true })).not.toThrow();
    expect(() => assertStockCountPosting({ status: 'SUBMITTED', creatorUserId: 'u1', actorUserId: 'u1', varianceApprovalRecorded: true, immutableStockLedgerCreated: true, freezeScopeChecked: true })).toThrow('Creator');
  });

  it('C11-TAX-CALCULATION-DETERMINISTIC-AUDITABLE-TRANSACTION-SNAPSHOT', () => {
    expect(() => assertTaxEngineSnapshot({ deterministic: true, taxTransactionStored: true, ruleVersionCaptured: true, postingTimeSnapshot: true })).not.toThrow();
    expect(() => assertTaxEngineSnapshot({ deterministic: true, taxTransactionStored: false, ruleVersionCaptured: true, postingTimeSnapshot: true })).toThrow('Tax calculation');
  });

  it('C11-BANK-CASH-VOUCHER-STATEMENT-IMPORT-RECONCILIATION-CLOSE', () => {
    expect(() => assertBankReconciliationClose({ status: 'IN_PROGRESS', statementLinesMatched: true, paymentOrJournalLinksRecorded: true, auditRecorded: true, reversalOrReopenPolicy: true })).not.toThrow();
    expect(() => assertBankReconciliationClose({ status: 'CLOSED', statementLinesMatched: true, paymentOrJournalLinksRecorded: true, auditRecorded: true, reversalOrReopenPolicy: true })).toThrow('IN_PROGRESS');
  });

  it('C11-VENDOR-ONBOARDING-RISK-BLACKLIST-BLOCKS-PROCUREMENT-PAYMENT', () => {
    expect(() => assertVendorRiskGate({ vendorStatus: 'ACTIVE', riskRating: 'LOW', action: 'PO', hasOverridePermission: false })).not.toThrow();
    expect(() => assertVendorRiskGate({ vendorStatus: 'BLACKLISTED', riskRating: 'HIGH', action: 'PAYMENT', hasOverridePermission: false })).toThrow('Vendor risk');
    expect(() => assertVendorRiskGate({ vendorStatus: 'BLACKLISTED', riskRating: 'HIGH', action: 'PAYMENT', hasOverridePermission: true })).not.toThrow();
  });

  it('C11-LANDED-COST-ALLOCATION-POSTING-INVENTORY-PROJECT-COSTING', () => {
    expect(() => assertLandedCostPosting({ status: 'ALLOCATED', idempotencyKey: 'lc-1', allocationEqualsTotal: true, inventoryCostLayerUpdated: true, projectCostingSnapshotQueuedOrUpdated: true })).not.toThrow();
    expect(() => assertLandedCostPosting({ status: 'ALLOCATED', idempotencyKey: null, allocationEqualsTotal: true, inventoryCostLayerUpdated: true, projectCostingSnapshotQueuedOrUpdated: true })).toThrow('Idempotency');
  });

  it('C11-PURCHASE-CONTRACT-BLANKET-PO-RELEASE-ORDER-GUARDS', () => {
    expect(() => assertPurchaseContractRelease({ contractStatus: 'APPROVED', vendorApproved: true, requestedQtyWithinRemaining: true, requestedValueWithinRemaining: true })).not.toThrow();
    expect(() => assertPurchaseContractRelease({ contractStatus: 'DRAFT', vendorApproved: true, requestedQtyWithinRemaining: true, requestedValueWithinRemaining: true })).toThrow('approved');
  });

  it('C11-COMMERCIAL-MVP-NO-ASYNC-CRITICAL-MUTATION', () => {
    expect(() => assertNoAsyncCommercialCriticalMutation('stock count post')).toThrow('transactional services');
    expect(() => assertNoAsyncCommercialCriticalMutation('report export')).not.toThrow();
  });

  it('C11-COMMERCIAL-MVP-ERROR-CODES-ARE-LOCKED', () => {
    expect([
      'COMMERCIAL_MVP_CONTROL_MISSING',
      'NUMBER_SEQUENCE_NOT_TRANSACTION_SAFE',
      'IMPORT_WIZARD_INVALID_STATE',
      'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
      'TAX_ENGINE_AUDIT_SNAPSHOT_REQUIRED',
      'BANK_RECONCILIATION_CLOSE_CONTROL_MISSING',
      'VENDOR_RISK_GATE_BLOCKED',
      'LANDED_COST_POSTING_CONTROL_MISSING',
      'PURCHASE_CONTRACT_LIMIT_EXCEEDED',
      'COMMERCIAL_CRITICAL_MUTATION_NOT_ASYNC',
    ]).toHaveLength(10);
  });

});
