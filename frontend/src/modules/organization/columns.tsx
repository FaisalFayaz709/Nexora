import type { EntityColumnConfig } from '@/modules/masters/columns';

export const branchColumns: EntityColumnConfig[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
];

export const departmentColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Department' },
  { key: 'branchId', label: 'Branch' },
  { key: 'managerEmployeeId', label: 'Manager' },
];

export const organizationColumnSets = {
  branchColumns,
  departmentColumns,
} as const;
