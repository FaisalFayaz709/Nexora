import type { EntityColumnConfig } from '@/modules/masters/columns';

export const ticketColumns: EntityColumnConfig[] = [
  { key: 'ticketNo', label: 'Ticket No' },
  { key: 'subject', label: 'Subject' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assetId', label: 'Asset' },
];

export const workOrderColumns: EntityColumnConfig[] = [
  { key: 'workOrderNo', label: 'Work Order' },
  { key: 'ticketId', label: 'Ticket' },
  { key: 'assetId', label: 'Asset' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'scheduledAt', label: 'Scheduled' },
];

export const serviceColumnSets = {
  ticketColumns,
  workOrderColumns,
} as const;
