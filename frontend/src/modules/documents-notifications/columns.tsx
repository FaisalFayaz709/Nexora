import type { EntityColumnConfig } from '@/modules/masters/columns';

export const documentNotificationColumns: EntityColumnConfig[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'channel', label: 'Channel' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
];

export const documentsnotificationsColumnSets = {
  documentNotificationColumns,
} as const;
