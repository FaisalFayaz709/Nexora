import type { EntityColumnConfig } from '@/modules/masters/columns';

export const reportColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Name' },
  { key: 'template.dataSource', label: 'Source' },
  { key: 'chartType', label: 'Chart' },
  { key: 'updatedAt', label: 'Updated' },
];

export const searchResultColumns: EntityColumnConfig[] = [
  { key: 'entityType', label: 'Type' },
  { key: 'title', label: 'Title' },
  { key: 'subtitle', label: 'Subtitle' },
  { key: 'updatedAt', label: 'Updated' },
];

export const reportsColumnSets = {
  reportColumns,
  searchResultColumns,
} as const;
