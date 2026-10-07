export const C11_COMMERCIAL_MVP = 'C11_COMMERCIAL_MVP' as const;

export const CommercialMvpPriorityOrder = ['P0', 'P1', 'P2', 'P3'] as const;

export const CommercialMvpAdditions = [
  { key: 'NUMBER_SEQUENCE_MANAGEMENT', priority: 'P0', owner: 'Platform', phase: 'Phase 0/1' },
  { key: 'DATA_IMPORT_WIZARD_BASELINE', priority: 'P0', owner: 'Platform', phase: 'Phase 2/3' },
  { key: 'STOCK_COUNT_CYCLE_COUNT', priority: 'P1', owner: 'Inventory', phase: 'Phase 3.5' },
  { key: 'TAX_ENGINE_BASELINE', priority: 'P1', owner: 'Finance', phase: 'Phase 9' },
  { key: 'BANK_CASH_MANAGEMENT_BASELINE', priority: 'P1', owner: 'Finance', phase: 'Phase 9' },
  { key: 'VENDOR_ONBOARDING_RISK', priority: 'P2', owner: 'Procurement', phase: 'Phase 4.5' },
  { key: 'LANDED_COST_VALUATION', priority: 'P2', owner: 'Inventory/Finance', phase: 'Phase 4/9' },
  { key: 'PURCHASE_CONTRACTS_BLANKET_PO', priority: 'P2', owner: 'Procurement', phase: 'Phase 4.5' },
  { key: 'REPORT_BUILDER_GPS_SAAS_BILLING_READY', priority: 'P3', owner: 'Platform/Reports/Field Service', phase: 'Phase 10/11' },
] as const;

export const CommercialMvpCommandEndpoints = [
  'GET /api/v1/number-sequences',
  'POST /api/v1/number-sequences',
  'POST /api/v1/number-sequences/:id/reset',
  'POST /api/v1/imports/upload',
  'POST /api/v1/imports/:id/validate',
  'POST /api/v1/imports/:id/commit',
  'POST /api/v1/imports/:id/rollback',
  'POST /api/v1/stock-counts',
  'POST /api/v1/stock-counts/:id/start',
  'POST /api/v1/stock-counts/:id/submit',
  'POST /api/v1/stock-counts/:id/post',
  'GET /api/v1/tax-codes',
  'POST /api/v1/tax-rules',
  'POST /api/v1/tax/calculate',
  'GET /api/v1/tax/reports',
  'GET /api/v1/bank-accounts',
  'POST /api/v1/bank-statements/import',
  'POST /api/v1/bank-reconciliations/:id/close',
  'POST /api/v1/vouchers/payment',
  'POST /api/v1/vouchers/receipt',
  'POST /api/v1/vendor-onboarding/requests',
  'POST /api/v1/vendor-onboarding/:id/submit',
  'POST /api/v1/vendor-onboarding/:id/approve',
  'POST /api/v1/vendors/:id/blacklist',
  'POST /api/v1/landed-costs',
  'POST /api/v1/landed-costs/:id/allocate',
  'POST /api/v1/landed-costs/:id/post',
  'POST /api/v1/purchase-contracts',
  'POST /api/v1/purchase-contracts/:id/approve',
  'POST /api/v1/purchase-contracts/:id/create-release-order',
] as const;

export const CommercialMvpAtomicTransactionRules = [
  'BUSINESS_NUMBER_GENERATION_USES_ROW_LOCK_OR_RESERVATION_WITH_TARGET_CREATION',
  'IMPORT_COMMIT_IS_VALIDATED_AND_TRANSACTIONAL_OR_CONTROLLED_CHUNK_WITH_ROLLBACK_POLICY',
  'STOCK_COUNT_POSTING_CREATES_STOCK_ADJUSTMENT_AND_IMMUTABLE_LEDGER_AFTER_APPROVAL',
  'TAX_CALCULATION_STORES_AUDITABLE_TAX_TRANSACTION_AT_POSTING_TIME',
  'BANK_RECONCILIATION_CLOSE_MATCHES_STATEMENT_LINES_AND_AUDITS_LINKS',
  'VENDOR_RISK_BLOCKS_RFQ_PO_PAYMENT_FOR_UNAPPROVED_OR_BLACKLISTED_VENDOR',
  'LANDED_COST_POSTING_RECONCILES_ALLOCATIONS_TO_TOTAL_AND_UPDATES_COST_LAYERS',
  'PURCHASE_CONTRACT_RELEASE_VALIDATES_REMAINING_QUANTITY_VALUE_AND_VENDOR_STATUS',
  'CRITICAL_COMMERCIAL_FINANCE_AND_INVENTORY_EFFECTS_NEVER_RUN_AS_ASYNC_SIDE_EFFECTS',
] as const;

export const CommercialMvpAcceptanceScenarios = [
  'C11-NUMBER-SEQUENCE-CONCURRENT-BUSINESS-NUMBER-UNIQUENESS',
  'C11-DATA-IMPORT-PREVIEW-VALIDATE-COMMIT-ROLLBACK-TRACEABILITY',
  'C11-STOCK-COUNT-FREEZE-SUBMIT-VARIANCE-APPROVAL-LEDGER-POSTING',
  'C11-TAX-CALCULATION-DETERMINISTIC-AUDITABLE-TRANSACTION-SNAPSHOT',
  'C11-BANK-CASH-VOUCHER-STATEMENT-IMPORT-RECONCILIATION-CLOSE',
  'C11-VENDOR-ONBOARDING-RISK-BLACKLIST-BLOCKS-PROCUREMENT-PAYMENT',
  'C11-LANDED-COST-ALLOCATION-POSTING-INVENTORY-PROJECT-COSTING',
  'C11-PURCHASE-CONTRACT-BLANKET-PO-RELEASE-ORDER-GUARDS',
  'C11-COMMERCIAL-MVP-MODULES-RESPECT-TENANT-RBAC-AUDIT-TRANSACTIONS',
] as const;

export type CommercialMvpPriority = typeof CommercialMvpPriorityOrder[number];
export type CommercialMvpAddition = typeof CommercialMvpAdditions[number];
export type CommercialMvpAcceptanceScenario = typeof CommercialMvpAcceptanceScenarios[number];
