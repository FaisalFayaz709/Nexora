import type { EntityColumnConfig } from '@/modules/masters/columns';

export const assetColumns: EntityColumnConfig[] = [
  { key: 'assetNo', label: 'Asset No' },
  { key: 'productId', label: 'Product' },
  { key: 'customerId', label: 'Customer' },
  { key: 'siteId', label: 'Site' },
  { key: 'projectId', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'installedAt', label: 'Installed' },
];

export const assetsColumnSets = {
  assetColumns,
} as const;
