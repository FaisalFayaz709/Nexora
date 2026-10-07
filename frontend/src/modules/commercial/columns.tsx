import type { EntityColumnConfig } from '@/modules/masters/columns';

export const commercialMvpColumns: EntityColumnConfig[] = [
  { key: 'module', label: 'Module' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'phase', label: 'Phase' },
];

export const commercialColumnSets = {
  commercialMvpColumns,
} as const;
