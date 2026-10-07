import type { EntityColumnConfig } from '@/modules/masters/columns';

export const portalWorkspaceColumns: EntityColumnConfig[] = [
  { key: 'subjectType', label: 'Subject' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'updatedAt', label: 'Updated' },
];

export const portalsColumnSets = {
  portalWorkspaceColumns,
} as const;
