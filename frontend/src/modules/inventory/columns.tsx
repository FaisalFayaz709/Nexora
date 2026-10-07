import type { EntityColumnConfig } from '@/modules/masters/columns';

export const stockBalanceColumns: EntityColumnConfig[] = [
  { key: 'productId', label: 'Product' },
  { key: 'warehouseId', label: 'Warehouse' },
  { key: 'locationId', label: 'Location' },
  { key: 'onHand', label: 'On Hand' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'available', label: 'Available' },
];

export const stockLedgerColumns: EntityColumnConfig[] = [
  { key: 'occurredAt', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'productId', label: 'Product' },
  { key: 'warehouseId', label: 'Warehouse' },
  { key: 'qty', label: 'Quantity' },
  { key: 'referenceType', label: 'Reference' },
];

export const warehouseColumns: EntityColumnConfig[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'branchId', label: 'Branch' },
  { key: 'status', label: 'Status' },
];

export const productColumns: EntityColumnConfig[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Name' },
  { key: 'trackingType', label: 'Tracking' },
  { key: 'standardCost', label: 'Standard Cost' },
];

export const inventoryColumnSets = {
  stockBalanceColumns,
  stockLedgerColumns,
  warehouseColumns,
  productColumns,
} as const;
