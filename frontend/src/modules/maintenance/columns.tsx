import type { EntityColumnConfig } from '@/modules/masters/columns';

export const maintenancePlanColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Plan' },
  { key: 'assetId', label: 'Asset' },
  { key: 'frequencyType', label: 'Frequency' },
  { key: 'active', label: 'Active' },
];

export const maintenanceScheduleColumns: EntityColumnConfig[] = [
  { key: 'dueAt', label: 'Due At' },
  { key: 'effectiveStatus', label: 'Status' },
  { key: 'maintenancePlanId', label: 'Plan' },
  { key: 'generatedWorkOrderId', label: 'Work Order' },
];

export const maintenanceColumnSets = {
  maintenancePlanColumns,
  maintenanceScheduleColumns,
} as const;
