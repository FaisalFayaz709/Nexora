import { z } from 'zod';
import { DecimalStringSchema, IsoDateSchema, IsoDateTimeSchema, PageQuerySchema, UuidSchema } from '../common';

export const GlobalSearchQuerySchema = PageQuerySchema.extend({
  q: z.string().min(1).max(160),
  entityTypes: z.string().max(500).optional(),
});

export const CalendarQuerySchema = PageQuerySchema.extend({
  from: IsoDateSchema,
  to: IsoDateSchema,
  entityTypes: z.string().max(500).optional(),
});

export const AuditLogQuerySchema = PageQuerySchema.extend({
  actorUserId: UuidSchema.optional(),
  subjectType: z.string().max(120).optional(),
  subjectId: UuidSchema.optional(),
  action: z.string().max(160).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export const ReportListQuerySchema = PageQuerySchema.extend({
  dataSource: z.string().max(80).optional(),
  owner: z.enum(['me', 'system', 'all']).default('all'),
});

export const ReportExportFormatSchema = z.enum(['CSV', 'XLSX', 'PDF']);
export const RequestReportExportSchema = z.object({
  reportId: UuidSchema,
  format: ReportExportFormatSchema.default('CSV'),
  filterJson: z.record(z.unknown()).default({}),
});

export const ImportSubjectTypeSchema = z.enum([
  'EMPLOYEE',
  'CUSTOMER',
  'CUSTOMER_SITE',
  'VENDOR',
  'PRODUCT_CATEGORY',
  'UNIT_OF_MEASURE',
  'PRODUCT',
  'WAREHOUSE',
  'INVENTORY',
]);

export const ImportDuplicatePolicySchema = z.enum(['FAIL', 'SKIP', 'UPDATE']);
export const ImportCommitModeSchema = z.enum(['TRANSACTIONAL_BATCH', 'CONTROLLED_CHUNK']);
export const ImportCellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const ImportRawRowSchema = z.record(z.string().min(1), ImportCellValueSchema);
export const ImportMappingSchema = z.record(z.string().min(1), z.string().min(1));
export const ImportRowStatusSchema = z.enum(['PENDING', 'VALID', 'INVALID', 'COMMITTED', 'SKIPPED', 'ROLLED_BACK']);

export const ImportUploadSchema = z.object({
  subjectType: ImportSubjectTypeSchema,
  fileName: z.string().min(1).max(240),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  mimeType: z.enum(['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  checksumSha256: z.string().min(64).max(64),
  documentId: UuidSchema.optional(),
});

export const ValidateImportSchema = z.object({
  mapping: ImportMappingSchema.default({}),
  duplicatePolicy: ImportDuplicatePolicySchema.default('FAIL'),
  rows: z.array(ImportRawRowSchema).min(1).max(5000).optional(),
  validateOnly: z.boolean().default(true),
});

export const CommitImportSchema = z.object({
  approvedByUserId: UuidSchema.optional(),
  mode: ImportCommitModeSchema.default('TRANSACTIONAL_BATCH'),
  commitValidRowsOnly: z.boolean().default(false),
});

export const RollbackImportSchema = z.object({
  reason: z.string().min(3).max(1000),
});

export type ImportSubjectType = z.infer<typeof ImportSubjectTypeSchema>;
export type ImportDuplicatePolicy = z.infer<typeof ImportDuplicatePolicySchema>;
export type ImportCommitMode = z.infer<typeof ImportCommitModeSchema>;
export type ImportRawRow = z.infer<typeof ImportRawRowSchema>;
export type ImportMapping = z.infer<typeof ImportMappingSchema>;

export const SaaSSubscriptionStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']);
export const CreateSaaSSubscriptionSchema = z.object({
  organizationId: UuidSchema,
  planId: UuidSchema,
  status: SaaSSubscriptionStatusSchema.default('TRIAL'),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.optional(),
  trialEndsAt: IsoDateTimeSchema.optional(),
});

export const SaaSUsageQuerySchema = PageQuerySchema.extend({
  organizationId: UuidSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export const PostSaaSInvoiceSchema = z.object({
  amount: DecimalStringSchema,
  dueDate: IsoDateSchema,
  memo: z.string().max(1000).optional(),
});


export const SaaSPlanLimitsSchema = z.object({
  userLimit: z.number().int().min(1).max(100000),
  storageGb: z.number().int().min(1).max(1000000),
  moduleLimit: z.number().int().min(1).max(200).optional(),
  apiCallLimitMonthly: z.number().int().min(0).optional(),
  featureLimits: z.record(z.unknown()).default({}),
});

export const CreateSaaSPlanSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_\-]+$/),
  name: z.string().min(2).max(200),
  moduleKeys: z.array(z.string().min(1).max(80)).min(1),
  limitsJson: SaaSPlanLimitsSchema,
  active: z.boolean().default(true),
});

export const UpdateSaaSPlanSchema = CreateSaaSPlanSchema.partial().extend({
  active: z.boolean().optional(),
});

export const UpdateSaaSSubscriptionSchema = z.object({
  planId: UuidSchema.optional(),
  status: SaaSSubscriptionStatusSchema.optional(),
  startsAt: IsoDateTimeSchema.optional(),
  endsAt: IsoDateTimeSchema.nullable().optional(),
});

export const CreateSaaSInvoiceSchema = z.object({
  organizationId: UuidSchema,
  subscriptionId: UuidSchema,
  invoiceNo: z.string().min(1).max(160),
  amount: DecimalStringSchema,
  dueDate: IsoDateSchema,
  memo: z.string().max(1000).optional(),
});

export const UpdateSaaSInvoiceSchema = z.object({
  amount: DecimalStringSchema.optional(),
  dueDate: IsoDateSchema.optional(),
  memo: z.string().max(1000).nullable().optional(),
});

export const SaaSUsageCollectionSchema = z.object({
  organizationId: UuidSchema,
  activeUsers: z.number().int().min(0),
  storageBytes: z.number().int().min(0),
  objectCount: z.number().int().min(0),
  apiCalls: z.number().int().min(0).default(0),
  measuredAt: IsoDateTimeSchema.optional(),
});

export const SaaSReadinessContract = {
  requiredLimits: ['userLimit', 'storageGb', 'moduleKeys', 'featureLimits'],
  enforcement: 'Plan limits must be checked server-side; frontend only reflects allowed modules and usage state.',
  billing: 'SaaS invoices remain platform-owner/admin records and posting is audited/idempotent.',
} as const;
