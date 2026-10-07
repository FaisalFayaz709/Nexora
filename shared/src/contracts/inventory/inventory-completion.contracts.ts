export const MissingPassM8InventoryCompletionMaturity =
  'MISSING_PASS_M8_SOURCE_PREFLIGHT_TRANSACTIONAL_INVENTORY_LEDGER_COMPLETION' as const;

export type InventoryCompletionCapability =
  | 'shared_contract'
  | 'locked_route'
  | 'controller_parse'
  | 'tenant_scoped_repository'
  | 'branch_scope'
  | 'row_lock'
  | 'stock_freeze_guard'
  | 'immutable_ledger'
  | 'serial_batch_integrity'
  | 'audit_on_mutation'
  | 'transaction_boundary'
  | 'runtime_concurrency_test_pending';

export type InventoryCompletionSubject =
  | 'STOCK_BALANCE'
  | 'STOCK_LEDGER'
  | 'SERIAL_NUMBER'
  | 'BATCH_LOT'
  | 'STOCK_RESERVATION'
  | 'STOCK_TRANSFER'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_COUNT';

export interface InventoryCompletionRow {
  readonly subject: InventoryCompletionSubject;
  readonly ownerModule: 'inventory';
  readonly apiSurface: string;
  readonly mutationKind: 'READ' | 'COMMAND';
  readonly capabilities: readonly InventoryCompletionCapability[];
  readonly productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING';
}

const commonCommandCapabilities = [
  'shared_contract',
  'locked_route',
  'controller_parse',
  'tenant_scoped_repository',
  'branch_scope',
  'row_lock',
  'stock_freeze_guard',
  'immutable_ledger',
  'serial_batch_integrity',
  'audit_on_mutation',
  'transaction_boundary',
  'runtime_concurrency_test_pending',
] as const;

export const InventoryCompletionRows = [
  {
    subject: 'STOCK_BALANCE',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/stock',
    mutationKind: 'READ',
    capabilities: ['shared_contract', 'locked_route', 'controller_parse', 'tenant_scoped_repository', 'branch_scope'],
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'STOCK_LEDGER',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/ledger',
    mutationKind: 'READ',
    capabilities: ['shared_contract', 'locked_route', 'controller_parse', 'tenant_scoped_repository', 'branch_scope', 'immutable_ledger'],
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'SERIAL_NUMBER',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/serials/:serialNo',
    mutationKind: 'READ',
    capabilities: ['shared_contract', 'locked_route', 'controller_parse', 'tenant_scoped_repository', 'branch_scope', 'serial_batch_integrity'],
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'BATCH_LOT',
    ownerModule: 'inventory',
    apiSurface: 'internal-facade-and-ledger-links',
    mutationKind: 'COMMAND',
    capabilities: commonCommandCapabilities,
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'STOCK_RESERVATION',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/reservations',
    mutationKind: 'COMMAND',
    capabilities: commonCommandCapabilities,
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'STOCK_TRANSFER',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/transfers',
    mutationKind: 'COMMAND',
    capabilities: commonCommandCapabilities,
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'STOCK_ADJUSTMENT',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/inventory/adjustments',
    mutationKind: 'COMMAND',
    capabilities: commonCommandCapabilities,
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
  {
    subject: 'STOCK_COUNT',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/stock-counts',
    mutationKind: 'COMMAND',
    capabilities: commonCommandCapabilities,
    productionStatus: 'SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING',
  },
] as const satisfies readonly InventoryCompletionRow[];

export const InventoryLockedCommandRoutes = [
  'POST /api/v1/inventory/reservations',
  'DELETE /api/v1/inventory/reservations/:id',
  'POST /api/v1/inventory/transfers',
  'POST /api/v1/inventory/transfers/:id/dispatch',
  'POST /api/v1/inventory/transfers/:id/receive',
  'POST /api/v1/inventory/adjustments',
  'POST /api/v1/inventory/adjustments/:id/post',
  'POST /api/v1/stock-counts',
  'POST /api/v1/stock-counts/:id/start',
  'POST /api/v1/stock-counts/:id/submit',
  'POST /api/v1/stock-counts/:id/post',
] as const;
