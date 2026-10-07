import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const warnings = [];
const passDate = '2026-09-07';

const runPrior = [
  'scripts/check-architecture.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-database-foundation.mjs',
  'scripts/check-database-runtime-foundation.mjs',
  'scripts/check-inventory.mjs',
  'scripts/check-docs-source-reconciliation.mjs',
  'scripts/check-procurement.mjs',
];

for (const script of runPrior) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function mustRead(path) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function modelBlock(schema, model) {
  const match = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return match?.[1] ?? '';
}

const schemaPath = join(root, 'database/prisma/schema.prisma');
const schema = mustRead(schemaPath);
const migrationsDir = join(root, 'database/prisma/migrations');
const seedDir = join(root, 'database/prisma/seed');
const procurementRepo = mustRead(join(root, 'backend/src/modules/procurement/procurement.repository.ts'));
const migrationLock = mustRead(join(migrationsDir, 'migration_lock.toml'));

if (!schema.includes('provider = "postgresql"')) failures.push('Prisma datasource provider must remain PostgreSQL.');
if (!schema.includes('provider = "prisma-client-js"')) failures.push('Prisma client generator must remain prisma-client-js.');
if (/\bFloat\b/.test(schema)) failures.push('Float is forbidden in schema.prisma; use Decimal/Numeric for money and quantities.');
if (!/provider\s*=\s*"postgresql"/.test(migrationLock)) failures.push('Prisma migration lock must remain PostgreSQL.');

const requiredModels = [
  'Organization',
  'Branch',
  'Department',
  'User',
  'Session',
  'Permission',
  'Role',
  'OrganizationMembership',
  'AuditLog',
  'Product',
  'Warehouse',
  'StockBalance',
  'StockTransaction',
  'PurchaseRequest',
  'RFQ',
  'SupplierQuotation',
  'PurchaseOrder',
  'GoodsReceipt',
  'GoodsReceiptItem',
  'QualityInspection',
  'ApprovalRequest',
  'Document',
  'BusinessEvent',
  'CustomerInvoice',
  'SupplierInvoice',
  'Payment',
  'JournalEntry',
  'NumberSequence',
  'ImportBatch',
  'TaxCode',
  'BankAccount',
  'StockCount',
  'LandedCost',
];

for (const model of requiredModels) {
  if (!modelBlock(schema, model)) failures.push(`Missing required Prisma model: ${model}`);
}

if (/model\s+GoodsReceiptInspection\s*\{/.test(schema)) {
  failures.push('Legacy GoodsReceiptInspection Prisma model still exists; locked entity name is QualityInspection.');
}

const qualityInspection = modelBlock(schema, 'QualityInspection');
for (const field of ['id', 'organizationId', 'goodsReceiptId', 'inspectorId', 'result', 'notes', 'inspectedAt']) {
  if (!new RegExp(`\\b${field}\\b`).test(qualityInspection)) failures.push(`QualityInspection missing field ${field}.`);
}
if (!qualityInspection.includes('@relation(fields:[goodsReceiptId], references:[id], onDelete:Cascade)')) {
  failures.push('QualityInspection must remain linked to GoodsReceipt with cascade delete for receipt-scoped inspections.');
}
if (!modelBlock(schema, 'GoodsReceipt').includes('inspections     QualityInspection[]')) {
  failures.push('GoodsReceipt must expose inspections as QualityInspection[].');
}
if (procurementRepo.includes('goodsReceiptInspection')) failures.push('Procurement repository still uses legacy goodsReceiptInspection Prisma delegate.');
if (!procurementRepo.includes('tx.qualityInspection.create')) failures.push('Procurement repository must create QualityInspection through the Prisma delegate.');

const tenantOwnedModels = [
  'OrganizationSetting',
  'AuditLog',
  'BusinessEvent',
  'Product',
  'Warehouse',
  'StockBalance',
  'StockTransaction',
  'PurchaseRequest',
  'RFQ',
  'SupplierQuotation',
  'PurchaseOrder',
  'GoodsReceipt',
  'QualityInspection',
  'ApprovalDefinition',
  'ApprovalRequest',
  'Document',
  'Notification',
  'CustomerInvoice',
  'SupplierInvoice',
  'Payment',
  'Expense',
  'JournalEntry',
  'NumberSequence',
  'ImportBatch',
  'TaxCode',
  'BankAccount',
  'StockCount',
  'LandedCost',
];
for (const model of tenantOwnedModels) {
  const block = modelBlock(schema, model);
  if (block && !/\borganizationId\s+String\b/.test(block)) failures.push(`Tenant-owned model lacks organizationId: ${model}`);
}

const decimalModels = ['PurchaseOrder', 'PurchaseOrderItem', 'StockBalance', 'StockTransaction', 'CustomerInvoice', 'SupplierInvoice', 'Payment', 'JournalLine'];
for (const model of decimalModels) {
  const block = modelBlock(schema, model);
  if (block && /\b(total|amount|qty|debit|credit|balance|unitPrice|orderedQty|receivedQty|onHand|reserved)\b/.test(block) && !block.includes('@db.Decimal')) {
    failures.push(`${model} has money/quantity-like fields but no @db.Decimal annotation found.`);
  }
}

const m4MigrationPath = join(migrationsDir, '20260907094000_pass_m4_quality_inspection_model_alignment/migration.sql');
const m4Migration = mustRead(m4MigrationPath);
for (const needle of [
  'ALTER TABLE IF EXISTS "GoodsReceiptInspection" RENAME TO "QualityInspection"',
  'RENAME CONSTRAINT "GoodsReceiptInspection_pkey" TO "QualityInspection_pkey"',
  'RENAME CONSTRAINT "GoodsReceiptInspection_result_check" TO "QualityInspection_result_check"',
  'ALTER INDEX IF EXISTS "GoodsReceiptInspection_org_grn_idx" RENAME TO "QualityInspection_org_grn_idx"',
]) {
  if (!m4Migration.includes(needle)) failures.push(`M4 migration missing expected data-preserving rename: ${needle}`);
}

const migrationPaths = existsSync(migrationsDir)
  ? readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(migrationsDir, entry.name, 'migration.sql'))
      .filter((path) => existsSync(path))
  : [];
if (migrationPaths.length < 20) warnings.push(`Only ${migrationPaths.length} migration files found; verify no archive extraction issue.`);
for (const path of migrationPaths) {
  const sql = readFileSync(path, 'utf8');
  const rel = relative(root, path);
  if (!sql.trim()) failures.push(`Empty migration file: ${rel}`);
  const sqlWithoutComments = sql.replace(/^\s*--.*$/gm, '');
  if (/\b(DOUBLE\s+PRECISION|REAL|FLOAT)\b/i.test(sqlWithoutComments)) failures.push(`Floating numeric type found in migration: ${rel}`);
  if (/\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b/i.test(sql)) failures.push(`Destructive migration statement found: ${rel}`);
}

const permissionsPath = join(seedDir, 'permissions.seed.json');
const permissions = JSON.parse(mustRead(permissionsPath));
if (permissions.length < 170) failures.push(`Permission seed count is too low: ${permissions.length}`);
if (new Set(permissions.map((permission) => permission.key)).size !== permissions.length) failures.push('Permission seed has duplicate keys.');
for (const permission of ['purchase_request.approve', 'purchase_order.approve', 'goods_receipt.create', 'supplier_invoice.approve', 'payment.create', 'stock_count.post', 'bank.manage']) {
  if (!permissions.some((item) => item.key === permission)) failures.push(`Missing required permission seed: ${permission}`);
}

for (const seed of ['feature-flags.seed.json', 'module-registry.seed.json']) {
  const path = join(seedDir, seed);
  const parsed = JSON.parse(mustRead(path));
  if (!Array.isArray(parsed) || parsed.length === 0) failures.push(`${seed} must be a non-empty array.`);
}

const matrix = mustRead(join(root, 'docs/traceability/database-entity-matrix.csv'));
if (!matrix.includes('Procurement,QualityInspection,"id, organizationId, goodsReceiptId, inspectorId, result, notes",Receiving quality check,Core §7,IMPLEMENTED_STATIC_ONLY')) {
  failures.push('Database traceability matrix does not show QualityInspection as IMPLEMENTED_STATIC_ONLY.');
}

const outDir = join(root, 'certification-output');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'pass-m4-database-certification.json'),
  JSON.stringify(
    {
      generatedAt: `${passDate}T14:40:00+05:00`,
      pass: 'M4',
      result: failures.length ? 'FAILED' : 'PASSED',
      checks: {
        prismaProvider: 'postgresql',
        requiredModels: requiredModels.length,
        tenantOwnedModelsChecked: tenantOwnedModels.length,
        migrationFilesChecked: migrationPaths.length,
        permissionSeeds: Array.isArray(permissions) ? permissions.length : 0,
        qualityInspectionAligned: !failures.some((failure) => failure.includes('QualityInspection') || failure.includes('GoodsReceiptInspection')),
      },
      warnings,
      failures,
      runtimeLimitations: [
        'Prisma CLI validation/generate/migrate/seed still requires pnpm-lock.yaml, installed dependencies and a PostgreSQL DATABASE_URL on the developer machine.',
      ],
    },
    null,
    2,
  ),
);

if (failures.length) {
  console.error('PASS M4 database schema/migration gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS M4 database schema/migration gate PASSED: ${requiredModels.length} required models, ${tenantOwnedModels.length} tenant-owned checks, ${migrationPaths.length} migrations, ${permissions.length} permissions.`);
if (warnings.length) {
  console.warn('PASS M4 warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
