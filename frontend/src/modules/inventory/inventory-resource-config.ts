import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type InventoryResourceKey =
  | 'products'
  | 'product-categories'
  | 'warehouses'
  | 'warehouse-locations'
  | 'stock-balances'
  | 'stock-ledger'
  | 'serial-lookup'
  | 'reservations'
  | 'transfers'
  | 'adjustments'
  | 'stock-counts';

export type InventoryCommandKey =
  | 'release-reservation'
  | 'dispatch-transfer'
  | 'receive-transfer'
  | 'post-adjustment'
  | 'start-stock-count'
  | 'submit-stock-count'
  | 'post-stock-count';

export type InventoryCommandConfig = {
  key: InventoryCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  irreversibleEffects: readonly string[];
};

export type InventoryResourceConfig = {
  key: InventoryResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  endpointMode: 'crud' | 'read-only' | 'command-only' | 'lookup';
  viewPermission: PermissionKey;
  createPermission?: PermissionKey | undefined;
  updatePermission?: PermissionKey | undefined;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; endpoint?: string }[];
  commands: readonly InventoryCommandConfig[];
};

const inventoryLedgerNote =
  'Inventory quantities are never changed by a generic edit form. Critical inventory mutations use explicit command endpoints, PostgreSQL transactions, immutable stock-ledger records, tenant/branch checks and audit events.';

export const InventoryResourceConfigs = {
  products: {
    key: 'products',
    title: 'Inventory Products',
    singularTitle: 'Product',
    routeBase: '/inventory/products',
    endpoint: '/products',
    endpointMode: 'crud',
    viewPermission: 'product.view',
    createPermission: 'product.create',
    updatePermission: 'product.update',
    description: 'SKU, category, unit, serial/batch tracking type, thresholds, cost and sales metadata. Product edits cannot alter stock balances.',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'categoryId', label: 'Category' },
      { key: 'trackingType', label: 'Tracking' },
      { key: 'standardCost', label: 'Standard cost' },
      { key: 'minStock', label: 'Minimum stock' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['sku', 'name', 'trackingType', 'status'],
    profileFields: ['categoryId', 'unitId', 'brand', 'model', 'barcode', 'standardCost', 'salesPrice', 'minStock', 'maxStock', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Stock balances', description: 'Current on-hand/reserved/available quantities come from /inventory/stock with product filters.' },
      { title: 'Immutable ledger', description: 'Movement evidence comes from /inventory/ledger; product forms never write balances.' },
      { title: 'Serial/batch tracking', description: 'Serialized units are traced through /inventory/serials/:serialNo and later asset linkage.' },
    ],
    commands: [],
  },
  'product-categories': {
    key: 'product-categories',
    title: 'Product Categories',
    singularTitle: 'Product Category',
    routeBase: '/inventory/product-categories',
    endpoint: '/product-categories',
    endpointMode: 'crud',
    viewPermission: 'product.view',
    createPermission: 'product.create',
    updatePermission: 'product.update',
    description: 'Product taxonomy used by inventory masters, reporting, stock filters and procurement item grouping.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'parentId', label: 'Parent category' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'parentId', 'status'],
    profileFields: ['description', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Products in category', description: 'Products remain the owning stock master; categories organize but do not mutate stock.' },
      { title: 'Import trace', description: 'Category records imported from Excel/CSV must link back to ImportBatch when the backend exposes it.' },
    ],
    commands: [],
  },
  warehouses: {
    key: 'warehouses',
    title: 'Inventory Warehouses',
    singularTitle: 'Warehouse',
    routeBase: '/inventory/warehouses',
    endpoint: '/warehouses',
    endpointMode: 'crud',
    viewPermission: 'warehouse.view',
    createPermission: 'warehouse.create',
    updatePermission: 'warehouse.update',
    description: 'Branch-scoped stock locations that own balances, stock-count scopes and source/destination transfer controls.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'branchId', label: 'Branch' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'branchId', 'status'],
    profileFields: ['addressId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Warehouse locations', description: 'Zone/rack/shelf/bin hierarchy supports stock balances and ledger location references.' },
      { title: 'Stock balances', description: 'Read from /inventory/stock; balances are materialized and tenant/branch scoped.' },
      { title: 'Transfers and stock counts', description: 'Dispatch/receive and count posting are command-driven and audit logged.' },
    ],
    commands: [],
  },
  'warehouse-locations': {
    key: 'warehouse-locations',
    title: 'Warehouse Locations',
    singularTitle: 'Warehouse Location',
    routeBase: '/inventory/warehouse-locations',
    endpoint: '/warehouse-locations',
    endpointMode: 'crud',
    viewPermission: 'warehouse.view',
    createPermission: 'warehouse.create',
    updatePermission: 'warehouse.update',
    description: 'Zone, rack, shelf and bin hierarchy used to record precise stock balances and stock transaction locations.',
    columns: [
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'type', label: 'Type' },
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'parentId', label: 'Parent location' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['warehouseId', 'type', 'code', 'name', 'status'],
    profileFields: ['parentId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Stock balance by bin', description: 'The stock balance endpoint can filter by location to prove operational quantities.' },
      { title: 'Stock count scope', description: 'Cycle counts may freeze and verify one warehouse location rather than a full warehouse.' },
    ],
    commands: [],
  },
  'stock-balances': {
    key: 'stock-balances',
    title: 'Stock Balances',
    singularTitle: 'Stock Balance',
    routeBase: '/inventory/stock',
    endpoint: '/inventory/stock',
    endpointMode: 'read-only',
    viewPermission: 'inventory.view',
    description: 'Tenant and branch-scoped current on-hand, reserved and available stock by product, warehouse and location.',
    columns: [
      { key: 'productId', label: 'Product' },
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'locationId', label: 'Location' },
      { key: 'onHand', label: 'On hand' },
      { key: 'reserved', label: 'Reserved' },
      { key: 'available', label: 'Available' },
    ],
    identityFields: ['productId', 'warehouseId', 'locationId'],
    profileFields: ['onHand', 'reserved', 'available', 'updatedAt'],
    relatedPanels: [
      { title: 'Ledger reconciliation', description: 'Balance is verified against immutable stock transactions and concurrency tests.' },
      { title: 'Reservations', description: 'Free stock is reduced only by reservation commands that pass backend concurrency checks.' },
    ],
    commands: [],
  },
  'stock-ledger': {
    key: 'stock-ledger',
    title: 'Stock Ledger',
    singularTitle: 'Stock Transaction',
    routeBase: '/inventory/ledger',
    endpoint: '/inventory/ledger',
    endpointMode: 'read-only',
    viewPermission: 'inventory.view',
    description: 'Append-only movement history for receipts, transfers, issues, returns, damaged stock, adjustments and customer installations.',
    columns: [
      { key: 'occurredAt', label: 'Occurred at' },
      { key: 'type', label: 'Type' },
      { key: 'productId', label: 'Product' },
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'locationId', label: 'Location' },
      { key: 'qty', label: 'Quantity' },
      { key: 'referenceType', label: 'Reference type' },
      { key: 'referenceId', label: 'Reference id' },
    ],
    identityFields: ['type', 'productId', 'warehouseId', 'referenceType', 'referenceId'],
    profileFields: ['locationId', 'qty', 'occurredAt', 'createdAt'],
    relatedPanels: [
      { title: 'Reference record', description: 'Each ledger line links to a receipt, transfer, project issue, service report, adjustment or installation.' },
      { title: 'Audit evidence', description: 'Ledger lines are corrected by reversals or adjustment records, not destructive edits.' },
    ],
    commands: [],
  },
  'serial-lookup': {
    key: 'serial-lookup',
    title: 'Serial Lookup',
    singularTitle: 'Serial Number',
    routeBase: '/inventory/serials',
    endpoint: '/inventory/serials',
    endpointMode: 'lookup',
    viewPermission: 'inventory.view',
    description: 'Find an individually tracked unit and trace its warehouse, status, stock movement and asset linkage.',
    columns: [
      { key: 'serialNo', label: 'Serial number' },
      { key: 'productId', label: 'Product' },
      { key: 'status', label: 'Status' },
      { key: 'currentWarehouseId', label: 'Warehouse' },
      { key: 'assetId', label: 'Asset' },
    ],
    identityFields: ['serialNo', 'productId', 'status'],
    profileFields: ['currentWarehouseId', 'assetId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Asset lifecycle', description: 'When installed, the serial must move from stock to asset history and no longer remain available stock.' },
    ],
    commands: [],
  },
  reservations: {
    key: 'reservations',
    title: 'Stock Reservations',
    singularTitle: 'Stock Reservation',
    routeBase: '/inventory/reservations',
    endpoint: '/inventory/reservations',
    endpointMode: 'command-only',
    viewPermission: 'inventory.view',
    createPermission: 'inventory.reserve',
    updatePermission: 'inventory.reserve',
    description: 'Project reservations lock free stock and prevent another project from consuming committed material.',
    columns: [
      { key: 'productId', label: 'Product' },
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'projectId', label: 'Project' },
      { key: 'qty', label: 'Quantity' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['productId', 'warehouseId', 'projectId', 'status'],
    profileFields: ['qty', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Reservation safety', description: 'Backend must prevent two projects from reserving more free stock than exists.' },
    ],
    commands: [
      {
        key: 'release-reservation',
        label: 'Release reservation',
        endpointTemplate: '/inventory/reservations/:id',
        requiredPermission: 'inventory.reserve',
        idempotent: true,
        allowedStates: ['ACTIVE', 'RESERVED'],
        irreversibleEffects: ['Releases committed stock back to free stock if backend state allows it.', 'Creates audit evidence through the inventory service.'],
      },
    ],
  },
  transfers: {
    key: 'transfers',
    title: 'Stock Transfers',
    singularTitle: 'Stock Transfer',
    routeBase: '/inventory/transfers',
    endpoint: '/inventory/transfers',
    endpointMode: 'command-only',
    viewPermission: 'inventory.view',
    createPermission: 'inventory.transfer',
    updatePermission: 'inventory.transfer',
    description: 'Move stock between warehouses with explicit dispatch and receive commands, serial/batch capture, audit and immutable ledger postings.',
    columns: [
      { key: 'transferNo', label: 'Transfer #' },
      { key: 'fromWarehouseId', label: 'From' },
      { key: 'toWarehouseId', label: 'To' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
    ],
    identityFields: ['transferNo', 'fromWarehouseId', 'toWarehouseId', 'status'],
    profileFields: ['createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Ledger posting', description: 'Dispatch decrements source stock; receive increments destination stock inside controlled transactions.' },
      { title: 'Serial/batch trace', description: 'Serialized and batch allocations must reconcile to command quantities.' },
    ],
    commands: [
      {
        key: 'dispatch-transfer',
        label: 'Dispatch transfer',
        endpointTemplate: '/inventory/transfers/:id/dispatch',
        requiredPermission: 'inventory.transfer',
        idempotent: true,
        allowedStates: ['DRAFT', 'APPROVED'],
        irreversibleEffects: ['Decrements source warehouse stock.', 'Writes immutable stock ledger entries.', 'Moves serialized units/batches into in-transit state.'],
      },
      {
        key: 'receive-transfer',
        label: 'Receive transfer',
        endpointTemplate: '/inventory/transfers/:id/receive',
        requiredPermission: 'inventory.receive',
        idempotent: true,
        allowedStates: ['IN_TRANSIT', 'DISPATCHED'],
        irreversibleEffects: ['Increments destination warehouse stock.', 'Closes transfer quantities against received lines.', 'Writes immutable ledger and audit records.'],
      },
    ],
  },
  adjustments: {
    key: 'adjustments',
    title: 'Stock Adjustments',
    singularTitle: 'Stock Adjustment',
    routeBase: '/inventory/adjustments',
    endpoint: '/inventory/adjustments',
    endpointMode: 'command-only',
    viewPermission: 'inventory.view',
    createPermission: 'inventory.adjust',
    updatePermission: 'inventory.adjust',
    description: 'Controlled correction workflow for warehouse variances; posting creates immutable ledger records and may require approval.',
    columns: [
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { key: 'approvalRequestId', label: 'Approval' },
      { key: 'createdAt', label: 'Created' },
    ],
    identityFields: ['warehouseId', 'status', 'approvalRequestId'],
    profileFields: ['reason', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Approval threshold', description: 'High-risk variances must route through approval/maker-checker controls before posting.' },
      { title: 'Ledger entries', description: 'Posting writes adjustment ledger entries and cannot silently edit prior stock transactions.' },
    ],
    commands: [
      {
        key: 'post-adjustment',
        label: 'Post adjustment',
        endpointTemplate: '/inventory/adjustments/:id/post',
        requiredPermission: 'inventory.adjust',
        idempotent: true,
        allowedStates: ['APPROVED', 'DRAFT'],
        irreversibleEffects: ['Changes materialized stock balance.', 'Creates immutable stock ledger records.', 'Audits the variance and actor.'],
      },
    ],
  },
  'stock-counts': {
    key: 'stock-counts',
    title: 'Stock Counts / Cycle Counts',
    singularTitle: 'Stock Count',
    routeBase: '/inventory/stock-counts',
    endpoint: '/stock-counts',
    endpointMode: 'command-only',
    viewPermission: 'inventory.view',
    createPermission: 'stock_count.manage',
    updatePermission: 'stock_count.manage',
    description: 'Physical and cycle counting workflow with stock freeze, counted quantity capture, variance approval and ledger-backed posting.',
    columns: [
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'locationId', label: 'Location' },
      { key: 'countType', label: 'Count type' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
    ],
    identityFields: ['warehouseId', 'locationId', 'countType', 'status'],
    profileFields: ['createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Variance approval', description: 'Variance lines must be explainable, approval-threshold controlled and posted through stock adjustment records.' },
      { title: 'Count audit history', description: 'Count start, submit and post commands must create audit evidence and preserve source quantities.' },
    ],
    commands: [
      {
        key: 'start-stock-count',
        label: 'Start stock count',
        endpointTemplate: '/stock-counts/:id/start',
        requiredPermission: 'stock_count.manage',
        idempotent: true,
        allowedStates: ['DRAFT'],
        irreversibleEffects: ['Freezes affected warehouse/location scope where backend policy enables stock freeze.', 'Generates or locks count lines for the selected scope.'],
      },
      {
        key: 'submit-stock-count',
        label: 'Submit counted quantities',
        endpointTemplate: '/stock-counts/:id/submit',
        requiredPermission: 'stock_count.manage',
        idempotent: true,
        allowedStates: ['IN_PROGRESS'],
        irreversibleEffects: ['Records counted quantities and calculates variances for review.', 'Moves the count toward approval/posting controls.'],
      },
      {
        key: 'post-stock-count',
        label: 'Post count variance',
        endpointTemplate: '/stock-counts/:id/post',
        requiredPermission: 'stock_count.post',
        idempotent: true,
        allowedStates: ['SUBMITTED', 'APPROVED'],
        irreversibleEffects: ['Creates stock adjustment records and immutable stock-ledger entries.', 'Changes materialized stock balances after approval rules pass.'],
      },
    ],
  },
} satisfies Record<InventoryResourceKey, InventoryResourceConfig>;

export const InventoryResourceKeys = Object.keys(InventoryResourceConfigs) as InventoryResourceKey[];

export function getInventoryResourceConfig(key: InventoryResourceKey): InventoryResourceConfig {
  return InventoryResourceConfigs[key];
}

export const InventoryCompletionPrinciples = [
  inventoryLedgerNote,
  'All list/grid surfaces use the shared TanStack Table DataTable wrapper and server-side pagination/filtering conventions.',
  'All create/edit/command surfaces use React Hook Form with shared Zod contracts or module-owned Zod composition, then submit through the centralized Fastify API client.',
  'Read-only stock balance and stock ledger pages never expose create/edit buttons, because balances and ledgers are results of workflow commands.',
  'Command-only workflows never assume hidden Next.js APIs; they call Fastify /api/v1 endpoints through the centralized API layer.',
] as const;
