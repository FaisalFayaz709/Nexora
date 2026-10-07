import type { EntityColumnConfig } from '@/modules/masters/columns';

export const userColumns: EntityColumnConfig[] = [
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'lastLoginAt', label: 'Last Login' },
];

export const roleColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Role' },
  { key: 'systemRole', label: 'System Role' },
  { key: 'status', label: 'Status' },
];

export const identityColumnSets = {
  userColumns,
  roleColumns,
} as const;
