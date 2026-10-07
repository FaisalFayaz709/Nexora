import type { EntityColumnConfig } from '@/modules/masters/columns';

export const approvalInboxColumns: EntityColumnConfig[] = [
  { key: 'subjectType', label: 'Subject' },
  { key: 'subjectId', label: 'Subject ID' },
  { key: 'definitionName', label: 'Workflow' },
  { key: 'status', label: 'Status' },
];

export const approvalDefinitionColumns: EntityColumnConfig[] = [
  { key: 'subjectType', label: 'Subject Type' },
  { key: 'name', label: 'Definition' },
  { key: 'active', label: 'Active' },
];

export const approvalsColumnSets = {
  approvalInboxColumns,
  approvalDefinitionColumns,
} as const;
