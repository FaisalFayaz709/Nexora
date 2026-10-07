import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Data Import Wizard PostgreSQL/API acceptance',
  requirements: [
    { name: 'validates uploaded import rows before commit', evidence: 'upload sample batch, pass parsed CSV/XLSX rows to validate, persist normalized rows and row-level ImportRowError evidence' },
    { name: 'detects duplicates per subject key and honors policy', evidence: 'validate employee/customer/vendor/product/warehouse/opening-stock duplicates under FAIL, SKIP and UPDATE policies' },
    { name: 'commits validated batches transactionally', evidence: 'commit valid batch and verify domain rows, row target references, ImportBatch status and audit event in one transaction' },
    { name: 'imports opening stock as inventory ledger evidence', evidence: 'commit INVENTORY batch and verify StockBalance plus OPENING_BALANCE StockTransaction reference ImportBatch' },
    { name: 'rolls back committed batches with audit trail', evidence: 'rollback committed batch and verify logical row rollback markers and audit events without destructive ledger edits' },
    { name: 'denies cross-tenant import job access', evidence: 'attempt validate/commit/rollback with another tenant and expect authorization failure' },
  ],
});
