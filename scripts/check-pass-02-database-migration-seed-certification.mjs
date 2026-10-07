#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const failures = [];
const blockers = [];
const warnings = [];
const checks = [];

function pathOf(path) {
  return resolve(root, path);
}

function rel(path) {
  return relative(root, path).replace(/\\/g, '/');
}

function hasFile(path) {
  return existsSync(pathOf(path)) && statSync(pathOf(path)).isFile();
}

function hasDir(path) {
  return existsSync(pathOf(path)) && statSync(pathOf(path)).isDirectory();
}

function read(path) {
  return readFileSync(pathOf(path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function check(name, ok, message, options = {}) {
  checks.push({ name, ok, severity: options.blocker ? 'blocker' : options.warning ? 'warning' : 'failure' });
  if (ok) return;
  if (options.warning) warnings.push(message);
  else if (options.blocker) blockers.push(message);
  else failures.push(message);
}

function modelBlock(schema, model) {
  const match = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  return match?.[1] ?? '';
}

function allModelNames(schema) {
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
}

function hasModel(schema, model) {
  return Boolean(modelBlock(schema, model));
}

function jsonArray(path) {
  try {
    const parsed = readJson(path);
    check(`${path} is an array`, Array.isArray(parsed), `${path} must be an array`);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    check(`${path} parses as JSON`, false, `${path} is not valid JSON: ${error.message}`);
    return [];
  }
}

function writeEvidence(status, message, extra = {}) {
  const output = {
    pass: 'PASS_02',
    name: 'Database, Prisma, migration and seed completion',
    mode: sourceOnly ? 'source-only' : 'strict-runtime',
    status,
    message,
    checkedAt: startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    warnings,
    blockers,
    failures,
    lockedStackPreserved: true,
    architectureChanged: false,
    runtimeCommandsRequiredOnDeveloperMachine: [
      'pnpm install --frozen-lockfile',
      'pnpm db:generate',
      'pnpm db:validate',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
      'pnpm --filter @nexora/database test',
    ],
    ...extra,
  };
  mkdirSync(pathOf('certification-output'), { recursive: true });
  writeFileSync(pathOf('certification-output/pass-02-database-migration-seed-certification.json'), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

const requiredFiles = [
  'database/prisma/schema.prisma',
  'database/prisma/migrations/migration_lock.toml',
  'database/prisma/seed/permissions.seed.json',
  'database/prisma/seed/feature-flags.seed.json',
  'database/prisma/seed/module-registry.seed.json',
  'database/prisma/seed/baseline.seed.json',
  'database/prisma/seed/seed.mjs',
  'database/package.json',
  'database/src/client.ts',
  'database/src/transaction.ts',
  'database/src/tenant.ts',
  'database/tests/schema-foundation.test.mjs',
];
for (const file of requiredFiles) check(`required database file exists: ${file}`, hasFile(file), `${file} is missing`);
check('Prisma migrations directory exists', hasDir('database/prisma/migrations'), 'database/prisma/migrations is missing');

const schema = hasFile('database/prisma/schema.prisma') ? read('database/prisma/schema.prisma') : '';
const migrationLock = hasFile('database/prisma/migrations/migration_lock.toml') ? read('database/prisma/migrations/migration_lock.toml') : '';
const seedText = hasFile('database/prisma/seed/seed.mjs') ? read('database/prisma/seed/seed.mjs') : '';
const packageJson = hasFile('package.json') ? readJson('package.json') : { scripts: {} };
const databasePackage = hasFile('database/package.json') ? readJson('database/package.json') : { scripts: {} };

check('Prisma datasource remains PostgreSQL', /datasource\s+db\s*\{[\s\S]*provider\s*=\s*"postgresql"/.test(schema), 'Prisma datasource provider must remain postgresql');
check('Prisma client generator remains prisma-client-js', /generator\s+client\s*\{[\s\S]*provider\s*=\s*"prisma-client-js"/.test(schema), 'Prisma generator provider must remain prisma-client-js');
check('Prisma migration lock remains PostgreSQL', /provider\s*=\s*"postgresql"/.test(migrationLock), 'migration_lock.toml must stay on PostgreSQL');
check('Schema has no Float type', !/\bFloat\b/.test(schema), 'Float is forbidden; use Decimal/Numeric for money and quantities');
check('Schema uses pgcrypto gen_random_uuid identifiers', schema.includes('dbgenerated("gen_random_uuid()")'), 'UUID generation must remain standardized with gen_random_uuid()');

const modelGroups = {
  identity: ['User', 'Session', 'MfaCredential', 'MfaRecoveryCode', 'Permission', 'Role', 'RolePermission', 'OrganizationMembership', 'UserRole', 'PasswordResetToken'],
  organization: ['Organization', 'Branch', 'Department', 'Team', 'Address', 'OrganizationSetting'],
  platform: ['AuditLog', 'BusinessEvent', 'IdempotencyKey', 'FeatureFlag', 'OrganizationFeature', 'ModuleConfiguration', 'SystemConfigurationHistory', 'SaaSPlan', 'SaaSSubscription', 'SaaSSubscriptionFeature', 'SaaSInvoice', 'TenantUsageMetric', 'TenantStorageUsage'],
  masters: ['Employee', 'Customer', 'CustomerContact', 'CustomerSite', 'Vendor', 'VendorContact', 'ProductCategory', 'UnitOfMeasure', 'Product', 'Warehouse', 'WarehouseLocation'],
  inventory: ['StockBalance', 'StockTransaction', 'StockTransactionSerial', 'StockTransactionBatch', 'StockReservation', 'StockTransfer', 'StockTransferItem', 'SerialNumber', 'BatchLot', 'StockAdjustment', 'StockAdjustmentLine', 'InventoryCostLayer'],
  procurement: ['MaterialRequirement', 'MaterialRequirementItem', 'PurchaseRequest', 'PurchaseRequestItem', 'RFQ', 'RFQVendor', 'SupplierQuotation', 'SupplierQuotationItem', 'PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceipt', 'GoodsReceiptItem', 'QualityInspection'],
  projects: ['Project', 'ProjectPhase', 'ProjectTask', 'ProjectTaskDependency', 'ProjectMilestone', 'ProjectMember', 'BillOfMaterials', 'BOMItem', 'ProjectBudget', 'ProjectBudgetLine', 'ProjectExpense', 'ProjectRisk', 'ProjectIssue', 'ProjectHandover'],
  assets: ['Asset', 'AssetInstallation', 'AssetHistory', 'AssetWarranty', 'AssetQrTag', 'AssetRMA'],
  service: ['Ticket', 'TicketComment', 'SlaPolicy', 'WorkOrder', 'WorkOrderAssignment', 'TechnicianProfile', 'ServiceReport', 'ServiceReportPart', 'ServiceVisit', 'ServiceVisitLocation', 'TechnicianLocationPing', 'TechnicianRoute', 'WorkOrderCheckIn', 'WorkOrderCheckOut'],
  maintenance: ['MaintenancePlan', 'MaintenanceSchedule', 'MaintenanceExecution', 'MaintenanceChecklist', 'MaintenanceChecklistItem', 'MaintenancePart'],
  finance: ['CustomerInvoice', 'CustomerInvoiceItem', 'SupplierInvoice', 'SupplierInvoiceItem', 'Payment', 'PaymentAllocation', 'Expense', 'ExpenseItem', 'FinancialPeriod', 'Account', 'JournalEntry', 'JournalLine', 'CreditNote', 'DebitNote'],
  commercialAddendum: ['VendorOnboardingRequest', 'VendorDocument', 'VendorBankAccount', 'VendorBlacklist', 'VendorCategoryApproval', 'VendorRiskAssessment', 'PurchaseContract', 'PurchaseContractItem', 'BlanketPurchaseOrder', 'BlanketPurchaseOrderItem', 'PurchaseReleaseOrder', 'PurchaseReleaseOrderItem', 'StockCount', 'StockCountLine', 'StockCountVariance', 'StockCountApproval', 'StockCountPosting', 'LandedCost', 'LandedCostLine', 'LandedCostAllocation', 'TaxJurisdiction', 'TaxCode', 'TaxRate', 'TaxRule', 'TaxTransaction', 'WithholdingTaxRule', 'BankAccount', 'CashAccount', 'BankStatement', 'BankStatementLine', 'BankReconciliation', 'PaymentVoucher', 'ReceiptVoucher', 'ChequeRegister'],
  documentsAndCommunication: ['Document', 'DocumentVersion', 'DocumentLink', 'DocumentAccessLog', 'Notification', 'NotificationPreference', 'EmailOutbox', 'CommunicationTemplate', 'CommunicationLog', 'EmailDeliveryLog', 'SmsDeliveryLog', 'MessageAttachment'],
  reportingSearchImport: ['ReportTemplate', 'SavedReport', 'ScheduledReport', 'ReportExecution', 'DashboardWidget', 'UserDashboard', 'SavedView', 'SearchIndexEntry', 'CalendarFeedItem', 'ImportTemplate', 'ImportMapping', 'ImportBatch', 'ImportRow', 'ImportRowError', 'DuplicateCheckRule'],
  crmPortalsPwaOps: ['Lead', 'Opportunity', 'SiteSurvey', 'Quotation', 'QuotationItem', 'SalesOrder', 'SalesOrderItem', 'CustomerContract', 'CustomerContractItem', 'PortalAccount', 'PortalAccessGrant', 'PortalActivityLog', 'OfflinePwaSyncPolicy', 'OfflinePwaSyncBatch', 'OfflinePwaSyncItem', 'FleetVehicle', 'ToolAsset', 'SafetyIncident', 'InspectionRun', 'LocalizationString', 'IntegrationConnection', 'IntegrationWebhook', 'IntegrationWebhookDelivery', 'IntegrationSyncLog'],
};
for (const [group, models] of Object.entries(modelGroups)) {
  for (const model of models) check(`Prisma model exists: ${group}.${model}`, hasModel(schema, model), `Missing required Prisma model: ${model}`);
}

const allModels = allModelNames(schema);
check('Schema contains a broad ERP model catalog', allModels.length >= 200, `Expected at least 200 Prisma models, found ${allModels.length}`);

const tenantOwnedModels = [
  'OrganizationSetting', 'Role', 'OrganizationMembership', 'AuditLog', 'BusinessEvent', 'IdempotencyKey', 'OrganizationFeature', 'ModuleConfiguration', 'SystemConfigurationHistory',
  'VendorOnboardingRequest', 'StockCount', 'InventoryCostLayer', 'Skill', 'Employee', 'Customer', 'CustomerSite', 'Vendor', 'ProductCategory', 'UnitOfMeasure', 'Product', 'Warehouse', 'ImportTemplate', 'NumberSequence', 'NumberSequenceReservation',
  'StockBalance', 'StockTransaction', 'StockReservation', 'StockTransfer', 'SerialNumber', 'BatchLot', 'StockAdjustment', 'MaterialRequirement', 'PurchaseRequest', 'RFQ', 'SupplierQuotation', 'PurchaseOrder', 'GoodsReceipt', 'QualityInspection',
  'ApprovalDefinition', 'ApprovalRequest', 'Project', 'Asset', 'AssetInstallation', 'AssetHistory', 'AssetWarranty', 'AssetQrTag', 'AssetRMA', 'Ticket', 'SlaPolicy', 'WorkOrder', 'TechnicianProfile', 'ServiceReport', 'ServiceVisit', 'MaintenancePlan', 'MaintenanceChecklist',
  'CustomerInvoice', 'SupplierInvoice', 'Payment', 'Expense', 'FinancialPeriod', 'Account', 'JournalEntry', 'CreditNote', 'DebitNote', 'LandedCost', 'TaxJurisdiction', 'TaxCode', 'TaxRate', 'TaxRule', 'TaxTransaction', 'WithholdingTaxRule', 'BankAccount', 'CashAccount',
  'VendorRiskAssessment', 'PurchaseContract', 'BlanketPurchaseOrder', 'PurchaseReleaseOrder', 'CommunicationTemplate', 'CommunicationLog', 'EmailDeliveryLog', 'SmsDeliveryLog', 'ReportTemplate', 'SavedReport', 'ScheduledReport', 'ReportExecution', 'DashboardWidget', 'UserDashboard', 'SavedView',
  'Attendance', 'LeaveType', 'LeaveBalance', 'LeaveRequest', 'PayrollRun', 'Lead', 'Opportunity', 'SiteSurvey', 'Quotation', 'SalesOrder', 'CustomerContract', 'Document', 'Notification', 'PortalAccount', 'PortalAccessGrant', 'OfflinePwaSyncPolicy', 'OfflinePwaSyncBatch', 'FleetVehicle', 'ToolAsset', 'SafetyIncident', 'InspectionRun', 'LocalizationString', 'ImportBatch', 'SaaSSubscription', 'SaaSInvoice', 'TenantUsageMetric', 'TenantStorageUsage', 'SearchIndexEntry', 'CalendarFeedItem', 'IntegrationConnection', 'IntegrationWebhook', 'IntegrationSyncLog',
];
for (const model of tenantOwnedModels) {
  const block = modelBlock(schema, model);
  if (!block) continue;
  check(`tenant-owned model has organizationId: ${model}`, /\borganizationId\s+String\b/.test(block), `${model} must contain organizationId`);
  check(`tenant-owned model has tenant-leading index or uniqueness: ${model}`, /@@(?:index|unique)\(\[organizationId/.test(block), `${model} needs a tenant-leading @@index or @@unique`);
}

const branchScopedModels = ['Department', 'Employee', 'Warehouse', 'PurchaseRequest', 'PurchaseOrder', 'Ticket', 'WorkOrder', 'BankAccount', 'CashAccount', 'PurchaseContract', 'BlanketPurchaseOrder', 'PurchaseReleaseOrder', 'PayrollRun'];
for (const model of branchScopedModels) {
  const block = modelBlock(schema, model);
  if (!block) continue;
  check(`branch-scoped model carries branchId: ${model}`, /\bbranchId\s+String\??\b/.test(block), `${model} should carry branchId for operational reporting/scope`);
  check(`branch-scoped model indexes branchId with organizationId: ${model}`, /@@(?:index|unique)\(\[organizationId, branchId/.test(block), `${model} should index organizationId + branchId`);
}

const appendOnlyModels = ['AuditLog', 'BusinessEvent', 'StockTransaction', 'JournalLine', 'JournalEntry'];
for (const model of appendOnlyModels) {
  const block = modelBlock(schema, model);
  if (!block) continue;
  check(`append-only/reversal model has created or occurred timestamp: ${model}`, /\b(createdAt|occurredAt|postedAt)\b/.test(block), `${model} must carry immutable timing evidence`);
  check(`append-only/reversal model has tenant scope where applicable: ${model}`, model === 'JournalLine' || /\borganizationId\b/.test(block), `${model} must be tenant scoped directly or through immutable parent`);
}

const businessNumberRules = [
  ['PurchaseRequest', 'prNo'], ['RFQ', 'rfqNo'], ['PurchaseOrder', 'poNo'], ['GoodsReceipt', 'grnNo'], ['CustomerInvoice', 'invoiceNo'], ['SupplierInvoice', 'invoiceNo'], ['Payment', 'paymentNo'], ['Project', 'projectNo'], ['Asset', 'assetNo'], ['Ticket', 'ticketNo'], ['WorkOrder', 'workOrderNo'], ['JournalEntry', 'entryNo'], ['StockTransfer', 'transferNo'], ['PurchaseContract', 'contractNo'], ['BlanketPurchaseOrder', 'blanketPoNo'], ['PurchaseReleaseOrder', 'releaseOrderNo'], ['SaaSInvoice', 'invoiceNo'], ['CreditNote', 'noteNo'], ['DebitNote', 'noteNo'], ['PayrollRun', 'payrollNo'], ['LandedCost', 'landedCostNo'],
];
for (const [model, field] of businessNumberRules) {
  const block = modelBlock(schema, model);
  if (!block) continue;
  check(`${model} has business number field ${field}`, new RegExp(`\\b${field}\\s+String`).test(block), `${model} missing ${field}`);
  check(`${model} business number is tenant-unique`, new RegExp(`@@unique\\(\\[organizationId, ${field}\\]`).test(block), `${model}.${field} must be unique per organization`);
}

const decimalExpectations = [
  ['Product', ['standardCost', 'salesPrice', 'minStock', 'maxStock']],
  ['StockBalance', ['onHand', 'reserved']],
  ['StockTransaction', ['qty']],
  ['PurchaseRequestItem', ['qty', 'estimatedPrice']],
  ['SupplierQuotation', ['total']],
  ['SupplierQuotationItem', ['qty', 'unitPrice']],
  ['PurchaseOrder', ['total']],
  ['PurchaseOrderItem', ['orderedQty', 'receivedQty', 'unitPrice', 'tax']],
  ['GoodsReceiptItem', ['receivedQty', 'acceptedQty', 'damagedQty']],
  ['CustomerInvoice', ['subtotal', 'tax', 'total', 'balance']],
  ['SupplierInvoice', ['total']],
  ['Payment', ['amount']],
  ['PaymentAllocation', ['amount']],
  ['Expense', ['total']],
  ['JournalLine', ['debit', 'credit']],
  ['LandedCost', ['totalCost']],
  ['TaxRate', ['ratePct']],
  ['BankStatementLine', ['debit', 'credit']],
];
for (const [model, fields] of decimalExpectations) {
  const block = modelBlock(schema, model);
  if (!block) continue;
  for (const field of fields) {
    const line = block.split('\n').find((row) => new RegExp(`\\b${field}\\b`).test(row)) ?? '';
    check(`${model}.${field} uses Decimal/NUMERIC`, /Decimal/.test(line) && /@db\.Decimal/.test(line), `${model}.${field} must use Decimal with @db.Decimal`);
  }
}

const migrationsDir = pathOf('database/prisma/migrations');
const migrationDirs = hasDir('database/prisma/migrations')
  ? readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  : [];
const migrationFiles = migrationDirs.map((dir) => join(migrationsDir, dir, 'migration.sql'));
check('At least 25 migration directories exist', migrationDirs.length >= 25, `Expected at least 25 migration directories; found ${migrationDirs.length}`);
check('Initial migration enables pgcrypto', migrationFiles.some((file) => existsSync(file) && readFileSync(file, 'utf8').includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')), 'Initial PostgreSQL migration must enable pgcrypto for gen_random_uuid()');
for (const migrationFile of migrationFiles) {
  const path = rel(migrationFile);
  check(`migration file exists: ${path}`, existsSync(migrationFile), `${path} is missing`);
  if (!existsSync(migrationFile)) continue;
  const sql = readFileSync(migrationFile, 'utf8');
  check(`migration is non-empty: ${path}`, sql.trim().length > 0, `${path} is empty`);
  const sqlWithoutComments = sql.replace(/^\s*--.*$/gm, '');
  check(`migration avoids floating numeric types: ${path}`, !/\b(DOUBLE\s+PRECISION|REAL|FLOAT)\b/i.test(sqlWithoutComments), `${path} contains floating numeric type`);
  check(`migration avoids destructive DROP TABLE/COLUMN: ${path}`, !/\bDROP\s+(TABLE|COLUMN)\b/i.test(sqlWithoutComments), `${path} contains destructive DROP TABLE/COLUMN`);
}

const permissions = hasFile('database/prisma/seed/permissions.seed.json') ? jsonArray('database/prisma/seed/permissions.seed.json') : [];
const featureFlags = hasFile('database/prisma/seed/feature-flags.seed.json') ? jsonArray('database/prisma/seed/feature-flags.seed.json') : [];
const moduleRegistry = hasFile('database/prisma/seed/module-registry.seed.json') ? jsonArray('database/prisma/seed/module-registry.seed.json') : [];
const baseline = hasFile('database/prisma/seed/baseline.seed.json') ? readJson('database/prisma/seed/baseline.seed.json') : {};

check('Permission seed has at least 170 keys', permissions.length >= 170, `Permission seed count too low: ${permissions.length}`);
check('Permission keys are unique', new Set(permissions.map((permission) => permission.key)).size === permissions.length, 'Permission seed contains duplicate keys');
for (const permission of ['identity.user.manage', 'organization.manage', 'purchase_request.approve', 'purchase_order.approve', 'goods_receipt.create', 'inventory.adjust', 'stock_count.post', 'supplier_invoice.approve', 'payment.create', 'journal.post', 'workflow.manage', 'audit.view', 'import.manage', 'tax.manage', 'bank.manage', 'feature.manage', 'saas.manage']) {
  check(`required permission seeded: ${permission}`, permissions.some((item) => item.key === permission), `Missing required permission seed: ${permission}`);
}

check('Feature flag seed includes commercial/addendum flags', featureFlags.length >= 12, `Feature flag seed should include commercial/addendum flags; found ${featureFlags.length}`);
for (const flagKey of ['platform.number-sequence', 'platform.import-wizard', 'vendor.onboarding', 'inventory.stock-count', 'inventory.landed-cost', 'finance.tax-engine', 'finance.bank-cash', 'procurement.purchase-contracts', 'reports.custom-builder', 'technician.offline-sync', 'platform.saas-billing']) {
  check(`required feature flag seeded: ${flagKey}`, featureFlags.some((flag) => flag.key === flagKey), `Missing required feature flag: ${flagKey}`);
}
const moduleKeys = new Set(moduleRegistry.map((module) => module.key));
check('Module registry contains broad ERP modules', moduleRegistry.length >= 20, `Module registry should have at least 20 module keys; found ${moduleRegistry.length}`);
for (const key of ['identity', 'organization', 'customers', 'vendors', 'inventory', 'procurement', 'approvals', 'projects', 'assets', 'service', 'maintenance', 'finance', 'reports', 'documents', 'portals', 'notifications', 'audit', 'imports', 'platform']) {
  check(`module registry includes ${key}`, moduleKeys.has(key), `Module registry missing ${key}`);
}
for (const flag of featureFlags) {
  check(`feature flag module exists in registry: ${flag.key}`, moduleKeys.has(flag.moduleKey), `Feature flag ${flag.key} references missing moduleKey ${flag.moduleKey}`);
}

const baselineCollections = {
  branches: 1,
  departments: 5,
  users: 1,
  roles: 2,
  unitsOfMeasure: 1,
  productCategories: 1,
  products: 1,
  warehouses: 1,
  customers: 1,
  vendors: 1,
  accounts: 5,
  numberSequences: 12,
  saasPlans: 1,
};
check('Baseline seed organization is present', Boolean(baseline.organization?.id && baseline.organization?.code), 'baseline.seed.json must define an organization');
for (const [collection, min] of Object.entries(baselineCollections)) {
  check(`baseline.seed.json has ${collection}`, Array.isArray(baseline[collection]) && baseline[collection].length >= min, `baseline.seed.json needs at least ${min} ${collection}`);
}
for (const entityType of ['PURCHASE_REQUEST', 'RFQ', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'CUSTOMER_INVOICE', 'SUPPLIER_INVOICE', 'PAYMENT', 'PROJECT', 'ASSET', 'TICKET', 'WORK_ORDER', 'JOURNAL_ENTRY']) {
  check(`baseline number sequence exists: ${entityType}`, baseline.numberSequences?.some((item) => item.entityType === entityType), `Missing baseline number sequence for ${entityType}`);
}

for (const marker of ['baseline.seed.json', 'prisma.$transaction', 'permission.upsert', 'featureFlag.upsert', 'organization.upsert', 'branch.upsert', 'role.upsert', 'rolePermission.createMany', 'organizationMembership.upsert', 'userRole.createMany', 'product.upsert', 'warehouse.upsert', 'customer.upsert', 'vendor.upsert', 'account.upsert', 'numberSequence.upsert', 'moduleConfiguration.upsert', 'organizationFeature.upsert']) {
  check(`seed script includes ${marker}`, seedText.includes(marker), `seed.mjs must include ${marker}`);
}

for (const script of ['db:generate', 'db:validate', 'db:migrate:deploy', 'db:migrate:status', 'db:seed', 'pass:02:source-check', 'pass:02:check', 'pass:02:certify', 'pass:02:certify:ps']) {
  check(`root package script exists: ${script}`, Boolean(packageJson.scripts?.[script]), `package.json missing required PASS 02/database script: ${script}`);
}
for (const script of ['prisma:generate', 'prisma:validate', 'prisma:migrate:deploy', 'prisma:migrate:status', 'prisma:seed', 'test']) {
  check(`database package script exists: ${script}`, Boolean(databasePackage.scripts?.[script]), `database/package.json missing required script: ${script}`);
}

let runtimeResults = [];
if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime gate', hasFile('pnpm-lock.yaml'), 'Strict database gate requires a real root pnpm-lock.yaml generated by pnpm', { blocker: true });
  check('DATABASE_URL is available for migration/seed proof', Boolean(process.env.DATABASE_URL), 'Strict database gate requires DATABASE_URL against PostgreSQL', { blocker: true });
  if (blockers.length === 0) {
    const commands = [
      ['pnpm', ['db:generate']],
      ['pnpm', ['db:validate']],
      ['pnpm', ['db:migrate:status']],
      ['pnpm', ['db:migrate:deploy']],
      ['pnpm', ['db:seed']],
      ['pnpm', ['--filter', '@nexora/database', 'test']],
    ];
    for (const [command, args] of commands) {
      const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe', shell: process.platform === 'win32' });
      runtimeResults.push({ command: `${command} ${args.join(' ')}`, status: result.status, stdout: result.stdout?.slice(-4000), stderr: result.stderr?.slice(-4000) });
      check(`runtime command passed: ${command} ${args.join(' ')}`, result.status === 0, `Runtime command failed: ${command} ${args.join(' ')}`);
    }
  }
}

let status = sourceOnly ? 'PASS_SOURCE_LEVEL' : 'GO';
let message = sourceOnly
  ? 'PASS 02 source-level database, migration and seed certification passed. Runtime Prisma migration/seed proof still requires a connected PostgreSQL environment.'
  : 'PASS 02 strict runtime database, migration and seed certification passed.';
if (failures.length > 0) {
  status = 'FAIL';
  message = 'PASS 02 database, migration and seed certification failed.';
} else if (blockers.length > 0) {
  status = 'HOLD';
  message = 'PASS 02 source checks passed, but strict runtime migration/seed proof is blocked until lockfile, dependencies and DATABASE_URL are available.';
}

writeEvidence(status, message, {
  modelCount: allModels.length,
  migrationCount: migrationDirs.length,
  permissionSeedCount: permissions.length,
  featureFlagSeedCount: featureFlags.length,
  moduleRegistryCount: moduleRegistry.length,
  baselineNumberSequenceCount: baseline.numberSequences?.length ?? 0,
  runtimeResults,
});

if (failures.length > 0 || (!sourceOnly && blockers.length > 0)) {
  console.error(message);
  for (const failure of failures) console.error(`- ${failure}`);
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

if (blockers.length > 0) {
  console.warn(message);
  for (const blocker of blockers) console.warn(`- ${blocker}`);
  process.exit(0);
}

console.log(message);
