import { z } from 'zod';
import { IsoDateTimeSchema, PageQuerySchema, UuidSchema } from '../common';

export const ReportBuilderContractMaturity =
  'APPENDIX_F_4_ENDPOINTS_WITH_IMPLEMENTATION_DERIVED_PAYLOADS' as const;

export const ReportDataSourceSchema = z.enum([
  'CUSTOMERS',
  'VENDORS',
  'PROJECTS',
  'PROCUREMENT',
  'INVENTORY',
  'ASSETS',
  'FIELD_SERVICE',
  'MAINTENANCE',
  'FINANCE_AR',
  'FINANCE_AP',
  'HR_EMPLOYEES',
  'AUDIT',
]);

export const ReportChartTypeSchema = z.enum([
  'TABLE',
  'BAR',
  'LINE',
  'PIE',
  'KPI',
]);

export const ReportExecutionStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const ScheduleFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
]);

export const ReportTemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dataSource: ReportDataSourceSchema,
  selectedFields: z.array(z.string().min(1).max(120)).min(1).max(100),
  filterJson: z.record(z.string(), z.unknown()).default({}),
  chartType: ReportChartTypeSchema.default('TABLE'),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
  isSystem: z.boolean().default(false),
});

export const SavedReportCreateSchema = z.object({
  templateId: UuidSchema,
  name: z.string().min(1).max(200),
  selectedFields: z.array(z.string().min(1).max(120)).min(1).max(100),
  filterJson: z.record(z.string(), z.unknown()).default({}),
  chartType: ReportChartTypeSchema.default('TABLE'),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
});

export const ScheduledReportCreateSchema = z.object({
  savedReportId: UuidSchema,
  frequency: ScheduleFrequencySchema,
  timezone: z.string().min(1).max(100),
  nextRunAt: IsoDateTimeSchema,
  recipients: z.array(z.string().email()).min(1).max(50),
  active: z.boolean().default(true),
});

export const ReportExecutionQuerySchema = PageQuerySchema.extend({});

export const ReportBuilderListQuerySchema = PageQuerySchema.extend({
  q: z.string().max(160).optional(),
  dataSource: ReportDataSourceSchema.optional(),
  status: z.string().max(80).optional(),
  owner: z.enum(['me', 'system', 'all']).default('all'),
});

export const ReportTemplateUpdateSchema = ReportTemplateCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const SavedReportUpdateSchema = SavedReportCreateSchema.omit({ templateId: true }).partial();

export const ScheduledReportUpdateSchema = ScheduledReportCreateSchema.partial();

export const DashboardWidgetCreateSchema = z.object({
  userDashboardId: UuidSchema.optional(),
  savedReportId: UuidSchema.optional(),
  title: z.string().min(1).max(200),
  widgetType: z.enum(['TABLE', 'BAR', 'LINE', 'PIE', 'KPI']),
  dataSource: z.string().min(1).max(80),
  layoutJson: z.record(z.string(), z.unknown()).default({}),
  configJson: z.record(z.string(), z.unknown()).default({}),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
});

export const SavedViewCreateSchema = z.object({
  entityType: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  columns: z.array(z.string().min(1).max(120)).min(1).max(100),
  filterJson: z.record(z.string(), z.unknown()).default({}),
  sortJson: z.record(z.string(), z.unknown()).optional(),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
  isDefault: z.boolean().default(false),
});

export const SavedViewUpdateSchema = SavedViewCreateSchema.partial();

