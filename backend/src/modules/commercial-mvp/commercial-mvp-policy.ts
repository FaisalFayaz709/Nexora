import { AppError } from '../../core/http/errors.js';

export const C11CommercialMvpControlKeys = [
  'NUMBER_SEQUENCE_MANAGEMENT',
  'DATA_IMPORT_WIZARD_BASELINE',
  'STOCK_COUNT_CYCLE_COUNT',
  'TAX_ENGINE_BASELINE',
  'BANK_CASH_MANAGEMENT_BASELINE',
  'VENDOR_ONBOARDING_RISK',
  'LANDED_COST_VALUATION',
  'PURCHASE_CONTRACTS_BLANKET_PO',
] as const;

export type C11CommercialMvpControlKey = typeof C11CommercialMvpControlKeys[number];
export type CommercialMvpPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface CommercialMvpControlStatus {
  readonly key: C11CommercialMvpControlKey;
  readonly priority: CommercialMvpPriority;
  readonly routeCovered: boolean;
  readonly servicePolicyCovered: boolean;
  readonly tenantScoped: boolean;
  readonly audited: boolean;
  readonly transactionalWhenCritical: boolean;
}

const requiredPriorities: Record<CommercialMvpPriority, readonly C11CommercialMvpControlKey[]> = {
  P0: ['NUMBER_SEQUENCE_MANAGEMENT', 'DATA_IMPORT_WIZARD_BASELINE'],
  P1: ['STOCK_COUNT_CYCLE_COUNT', 'TAX_ENGINE_BASELINE', 'BANK_CASH_MANAGEMENT_BASELINE'],
  P2: ['VENDOR_ONBOARDING_RISK', 'LANDED_COST_VALUATION', 'PURCHASE_CONTRACTS_BLANKET_PO'],
  P3: [],
};

export function assertCommercialMvpCoverage(statuses: readonly CommercialMvpControlStatus[]) {
  const byKey = new Map(statuses.map((status) => [status.key, status]));
  for (const key of C11CommercialMvpControlKeys) {
    const status = byKey.get(key);
    if (!status) throw new AppError(409, 'COMMERCIAL_MVP_CONTROL_MISSING', 'Commercial MVP control is missing from the pass coverage map.', { key });
    if (!status.routeCovered || !status.servicePolicyCovered) {
      throw new AppError(409, 'COMMERCIAL_MVP_CONTROL_INCOMPLETE', 'Commercial MVP control lacks route or service policy coverage.', { key });
    }
    if (!status.tenantScoped) {
      throw new AppError(409, 'COMMERCIAL_MVP_TENANT_SCOPE_MISSING', 'Commercial MVP control must be tenant scoped.', { key });
    }
    if (!status.audited) {
      throw new AppError(409, 'COMMERCIAL_MVP_AUDIT_MISSING', 'Commercial MVP control must produce audit evidence.', { key });
    }
    if (!status.transactionalWhenCritical) {
      throw new AppError(409, 'COMMERCIAL_MVP_TRANSACTION_PLAN_MISSING', 'Critical commercial control must be transaction planned.', { key });
    }
  }
  return true;
}

export function commercialMvpPriorityKeys(priority: CommercialMvpPriority) {
  return requiredPriorities[priority];
}

export function assertBusinessNumberGeneration(input: {
  readonly organizationScoped: boolean;
  readonly branchAware: boolean;
  readonly entityTypeScoped: boolean;
  readonly fiscalYearScoped: boolean;
  readonly usesRowLockOrReservation: boolean;
  readonly targetCreatedInSameTransaction: boolean;
}) {
  if (!input.organizationScoped || !input.entityTypeScoped || !input.fiscalYearScoped) {
    throw new AppError(409, 'NUMBER_SEQUENCE_SCOPE_INVALID', 'Business numbers require organization, entity type and fiscal-year scope.');
  }
  if (!input.branchAware) {
    throw new AppError(409, 'NUMBER_SEQUENCE_BRANCH_SCOPE_MISSING', 'Business number policy must support branch-specific scope where required.');
  }
  if (!input.usesRowLockOrReservation || !input.targetCreatedInSameTransaction) {
    throw new AppError(409, 'NUMBER_SEQUENCE_NOT_TRANSACTION_SAFE', 'Business number generation must use a lock/reservation and target creation in one transaction.');
  }
}

export function assertImportWizardLifecycle(status: string, command: 'validate' | 'commit' | 'rollback') {
  const allowed: Record<'validate' | 'commit' | 'rollback', readonly string[]> = {
    validate: ['UPLOADED', 'VALIDATION_FAILED', 'VALIDATED'],
    commit: ['VALIDATED'],
    rollback: ['COMMITTED'],
  } as const;
  if (!allowed[command].includes(status)) {
    throw new AppError(409, 'IMPORT_WIZARD_INVALID_STATE', 'Import wizard command is not allowed from the current state.', { status, command });
  }
}

export function assertStockCountPosting(input: {
  readonly status: string;
  readonly creatorUserId: string;
  readonly actorUserId: string;
  readonly varianceApprovalRecorded: boolean;
  readonly immutableStockLedgerCreated: boolean;
  readonly freezeScopeChecked: boolean;
}) {
  if (input.status !== 'SUBMITTED') throw new AppError(409, 'STOCK_COUNT_POST_INVALID_STATE', 'Only SUBMITTED stock counts can be posted.');
  if (input.creatorUserId === input.actorUserId) throw new AppError(403, 'STOCK_COUNT_MAKER_CHECKER_REQUIRED', 'Creator cannot post the same stock count.');
  if (!input.varianceApprovalRecorded || !input.immutableStockLedgerCreated || !input.freezeScopeChecked) {
    throw new AppError(409, 'STOCK_COUNT_CONTROL_INCOMPLETE', 'Stock count posting requires variance approval, freeze scope check and immutable ledger entries.');
  }
}

export function assertTaxEngineSnapshot(input: {
  readonly deterministic: boolean;
  readonly taxTransactionStored: boolean;
  readonly ruleVersionCaptured: boolean;
  readonly postingTimeSnapshot: boolean;
}) {
  if (!input.deterministic || !input.taxTransactionStored || !input.ruleVersionCaptured || !input.postingTimeSnapshot) {
    throw new AppError(409, 'TAX_ENGINE_AUDIT_SNAPSHOT_REQUIRED', 'Tax calculation must be deterministic and stored as transaction-time evidence.');
  }
}

export function assertBankReconciliationClose(input: {
  readonly status: string;
  readonly statementLinesMatched: boolean;
  readonly paymentOrJournalLinksRecorded: boolean;
  readonly auditRecorded: boolean;
  readonly reversalOrReopenPolicy: boolean;
}) {
  if (input.status !== 'IN_PROGRESS') throw new AppError(409, 'BANK_RECONCILIATION_INVALID_STATE', 'Only IN_PROGRESS reconciliations can be closed.');
  if (!input.statementLinesMatched || !input.paymentOrJournalLinksRecorded || !input.auditRecorded || !input.reversalOrReopenPolicy) {
    throw new AppError(409, 'BANK_RECONCILIATION_CLOSE_CONTROL_MISSING', 'Closing reconciliation requires matches, links, audit and correction policy.');
  }
}

export function assertVendorRiskGate(input: {
  readonly vendorStatus: string;
  readonly riskRating?: string | null;
  readonly action: 'RFQ' | 'PO' | 'PAYMENT';
  readonly hasOverridePermission: boolean;
}) {
  const blocked = input.vendorStatus === 'BLACKLISTED' || input.vendorStatus === 'PENDING_APPROVAL' || input.riskRating === 'HIGH';
  if (blocked && !input.hasOverridePermission) {
    throw new AppError(403, 'VENDOR_RISK_GATE_BLOCKED', 'Vendor risk policy blocks this procurement/payment action without explicit override permission.', input);
  }
}

export function assertLandedCostPosting(input: {
  readonly status: string;
  readonly idempotencyKey?: string | null;
  readonly allocationEqualsTotal: boolean;
  readonly inventoryCostLayerUpdated: boolean;
  readonly projectCostingSnapshotQueuedOrUpdated: boolean;
}) {
  if (input.status !== 'ALLOCATED') throw new AppError(409, 'LANDED_COST_POST_INVALID_STATE', 'Landed cost must be ALLOCATED before posting.');
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Landed cost posting requires Idempotency-Key.');
  if (!input.allocationEqualsTotal || !input.inventoryCostLayerUpdated || !input.projectCostingSnapshotQueuedOrUpdated) {
    throw new AppError(409, 'LANDED_COST_POSTING_CONTROL_MISSING', 'Landed cost posting must reconcile allocations and update costing evidence.');
  }
}

export function assertPurchaseContractRelease(input: {
  readonly contractStatus: string;
  readonly vendorApproved: boolean;
  readonly requestedQtyWithinRemaining: boolean;
  readonly requestedValueWithinRemaining: boolean;
}) {
  if (input.contractStatus !== 'APPROVED') throw new AppError(409, 'PURCHASE_CONTRACT_NOT_APPROVED', 'Release orders require an approved purchase contract.');
  if (!input.vendorApproved) throw new AppError(403, 'PURCHASE_CONTRACT_VENDOR_NOT_APPROVED', 'Release order vendor must pass onboarding/risk checks.');
  if (!input.requestedQtyWithinRemaining || !input.requestedValueWithinRemaining) {
    throw new AppError(409, 'PURCHASE_CONTRACT_LIMIT_EXCEEDED', 'Release order exceeds remaining contract quantity or value.');
  }
}

export function assertNoAsyncCommercialCriticalMutation(action: string) {
  const critical = /(number|import.*commit|stock.*count.*post|tax.*post|payment|voucher|bank.*reconciliation|landed.*cost.*post|purchase.*release|vendor.*blacklist)/i.test(action);
  const allowedSideEffect = /(document|email|notification|report|webhook|export|analytics)/i.test(action);
  if (critical && !allowedSideEffect) {
    throw new AppError(409, 'COMMERCIAL_CRITICAL_MUTATION_NOT_ASYNC', 'Critical commercial finance, stock, import and vendor controls must run in transactional services, not async jobs.');
  }
}
