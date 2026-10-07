import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, DecimalStringSchema, PageQuerySchema, UuidSchema } from '../common';

export const StockCountContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_APPENDIX_F_ENTITY_FIELDS_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const StockCountQuerySchema = PageQuerySchema.extend({
  warehouseId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  status: z.string().min(1).max(40).optional(),
  countType: z.enum(['FULL', 'CYCLE']).optional(),
});

export const CreateStockCountSchema = z.object({
  warehouseId: UuidSchema,
  locationId: UuidSchema.nullable().optional(),
  countType: z.enum(['FULL', 'CYCLE']).default('FULL'),
  productIds: z.array(UuidSchema).min(1).optional(),
});

export const StartStockCountSchema = z.object({
  productIds: z.array(UuidSchema).min(1).optional(),
});

export const SubmitStockCountSchema = z.object({
  lines: z.array(z.object({
    lineId: UuidSchema,
    countedQty: DecimalStringSchema.refine((value) => Number(value) >= 0, 'countedQty cannot be negative'),
  })).min(1),
});

export const PostStockCountSchema = z.object({
  comment: z.string().max(1000).nullable().optional(),
});

export const StockCountLineDataSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  systemQty: DecimalStringSchema,
  countedQty: DecimalStringSchema.nullable(),
  varianceQty: DecimalStringSchema.nullable(),
});

export const StockCountVarianceDataSchema = z.object({
  id: UuidSchema,
  lineId: UuidSchema,
  systemQty: DecimalStringSchema,
  countedQty: DecimalStringSchema,
  varianceQty: DecimalStringSchema,
});

export const StockCountDataSchema = z.object({
  id: UuidSchema,
  warehouseId: UuidSchema,
  locationId: UuidSchema.nullable(),
  countType: z.string(),
  status: z.string(),
  createdAt: z.string().optional(),
  frozenAt: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  postedAt: z.string().nullable().optional(),
});

export const StockCountDetailDataSchema = StockCountDataSchema.extend({
  lines: z.array(StockCountLineDataSchema),
  variances: z.array(StockCountVarianceDataSchema),
  posting: z.object({ stockAdjustmentId: UuidSchema, postedByUserId: UuidSchema, postedAt: z.string() }).nullable(),
});

export const StockCountSheetDataSchema = z.object({
  stockCountId: UuidSchema,
  warehouseId: UuidSchema,
  locationId: UuidSchema.nullable(),
  status: z.string(),
  frozenAt: z.string().nullable(),
  lines: z.array(StockCountLineDataSchema),
});

export const StockCountResponseSchema = apiDataEnvelope(StockCountDataSchema);
export const StockCountDetailResponseSchema = apiDataEnvelope(StockCountDetailDataSchema);
export const StockCountListResponseSchema = apiListEnvelope(StockCountDataSchema);
export const StockCountSheetResponseSchema = apiDataEnvelope(StockCountSheetDataSchema);

export type StockCountQuery = z.infer<typeof StockCountQuerySchema>;
export type CreateStockCountInput = z.infer<typeof CreateStockCountSchema>;
export type StartStockCountInput = z.infer<typeof StartStockCountSchema>;
export type SubmitStockCountInput = z.infer<typeof SubmitStockCountSchema>;
export type PostStockCountInput = z.infer<typeof PostStockCountSchema>;
