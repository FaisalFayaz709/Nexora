import type { EntityColumnConfig } from '@/modules/masters/columns';

export const documentColumns: EntityColumnConfig[] = [
  { key: 'fileName', label: 'File' }, { key: 'mimeType', label: 'Type' }, { key: 'size', label: 'Size' }, { key: 'category', label: 'Category' }, { key: 'createdAt', label: 'Created' },
];
export const reportColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Report' }, { key: 'template.dataSource', label: 'Source' }, { key: 'chartType', label: 'Chart' }, { key: 'updatedAt', label: 'Updated' },
];
export const reportTemplateColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Template' }, { key: 'dataSource', label: 'Data source' }, { key: 'requiredPermission', label: 'Required permission' }, { key: 'active', label: 'Active' },
];
export const savedReportColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Saved report' }, { key: 'templateId', label: 'Template' }, { key: 'ownerId', label: 'Owner' }, { key: 'updatedAt', label: 'Updated' },
];
export const scheduledReportColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Schedule' }, { key: 'savedReportId', label: 'Saved report' }, { key: 'frequency', label: 'Frequency' }, { key: 'nextRunAt', label: 'Next run' }, { key: 'active', label: 'Active' },
];
export const reportExecutionColumns: EntityColumnConfig[] = [
  { key: 'id', label: 'Execution' }, { key: 'reportId', label: 'Report' }, { key: 'format', label: 'Format' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created' },
];
export const notificationColumns: EntityColumnConfig[] = [
  { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'readAt', label: 'Read' }, { key: 'createdAt', label: 'Created' },
];
export const communicationColumns: EntityColumnConfig[] = [
  { key: 'subject', label: 'Subject' }, { key: 'channel', label: 'Channel' }, { key: 'recipient', label: 'Recipient' }, { key: 'deliveryStatus', label: 'Delivery' }, { key: 'createdAt', label: 'Created' },
];
export const auditLogColumns: EntityColumnConfig[] = [
  { key: 'action', label: 'Action' }, { key: 'subjectType', label: 'Subject' }, { key: 'actorUserId', label: 'Actor' }, { key: 'createdAt', label: 'Created' },
];
export const searchColumns: EntityColumnConfig[] = [
  { key: 'type', label: 'Type' }, { key: 'title', label: 'Title' }, { key: 'businessNo', label: 'Business no' }, { key: 'snippet', label: 'Snippet' },
];
export const calendarColumns: EntityColumnConfig[] = [
  { key: 'title', label: 'Event' }, { key: 'sourceType', label: 'Source' }, { key: 'startsAt', label: 'Starts' }, { key: 'endsAt', label: 'Ends' }, { key: 'status', label: 'Status' },
];

export const savedViewColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Saved view' }, { key: 'entityType', label: 'Entity' }, { key: 'isDefault', label: 'Default' }, { key: 'updatedAt', label: 'Updated' },
];
export const dashboardWidgetColumns: EntityColumnConfig[] = [
  { key: 'title', label: 'Widget' }, { key: 'widgetType', label: 'Type' }, { key: 'configJson.dataSource', label: 'Source' }, { key: 'updatedAt', label: 'Updated' },
];

export const saasColumns: EntityColumnConfig[] = [
  { key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'userLimit', label: 'Users' }, { key: 'storageLimitGb', label: 'Storage' }, { key: 'updatedAt', label: 'Updated' },
];
export const featureColumns: EntityColumnConfig[] = [
  { key: 'key', label: 'Feature' }, { key: 'module', label: 'Module' }, { key: 'enabled', label: 'Enabled' }, { key: 'updatedAt', label: 'Updated' },
];

export const platformColumnSets = {
  documentColumns, reportColumns, reportTemplateColumns, savedReportColumns, scheduledReportColumns, reportExecutionColumns, savedViewColumns, dashboardWidgetColumns,
  notificationColumns, communicationColumns, auditLogColumns, searchColumns, calendarColumns, saasColumns, featureColumns,
} as const;
