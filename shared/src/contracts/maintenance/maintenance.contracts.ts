import { z } from 'zod';
import {
  DecimalStringSchema,
  IdempotencyKeySchema,
  IsoDateSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';

export const MaintenanceContractMaturity =
  'PASS_14_SOURCE_LEVEL_MAINTENANCE_WARRANTY_RMA_COMPLETION' as const;

export const MaintenanceFrequencyTypeSchema = z.enum([
  'DAYS',
  'WEEKS',
  'MONTHS',
  'YEARS',
]);

export const MaintenanceScheduleStatusSchema = z.enum([
  'SCHEDULED',
  'DUE',
  'GENERATED',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
]);

export const MaintenanceExecutionStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const MaintenanceResultSchema = z.enum([
  'PASSED',
  'REPAIRED',
  'FAILED',
  'REPLACED',
]);

export const MaintenancePlanListQuerySchema = PageQuerySchema.extend({
  assetId: UuidSchema.optional(),
  active: z.coerce.boolean().optional(),
  frequencyType: MaintenanceFrequencyTypeSchema.optional(),
});

export const CreateMaintenanceChecklistItemSchema = z.object({
  sequence: z.number().int().positive(),
  label: z.string().min(1).max(500),
  required: z.boolean().default(true),
});

export const CreateMaintenancePlanSchema = z.object({
  assetId: UuidSchema,
  contractId: UuidSchema.nullable().optional(),
  name: z.string().min(1).max(200),
  frequencyType: MaintenanceFrequencyTypeSchema,
  intervalValue: z.number().int().positive(),
  startAt: IsoDateSchema,
  active: z.boolean().default(true),
  checklist: z.object({
    name: z.string().min(1).max(200),
    version: z.number().int().positive().default(1),
    items: z.array(CreateMaintenanceChecklistItemSchema).default([]),
  }).optional(),
  checklistId: UuidSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.checklist && value.checklistId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use either checklist or checklistId, not both.',
      path: ['checklistId'],
    });
  }
});

export const MaintenanceScheduleQuerySchema = PageQuerySchema.extend({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  branchId: UuidSchema.optional(),
  siteId: UuidSchema.optional(),
  assetId: UuidSchema.optional(),
  status: MaintenanceScheduleStatusSchema.optional(),
});

export const GenerateMaintenanceWorkOrderSchema = z.object({
  idempotencyKey: IdempotencyKeySchema.optional(),
});

export const MaintenancePartInputSchema = z.object({
  productId: UuidSchema,
  qty: DecimalStringSchema,
  sourceWarehouseId: UuidSchema,
  sourceLocationId: UuidSchema.nullable().optional(),
  batches: z.array(z.object({
    lotNo: z.string().min(1).max(120),
    qty: DecimalStringSchema,
  })).default([]),
});

export const CompleteMaintenanceExecutionSchema = z.object({
  result: MaintenanceResultSchema,
  completedAt: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
  parts: z.array(MaintenancePartInputSchema).default([]),
});
