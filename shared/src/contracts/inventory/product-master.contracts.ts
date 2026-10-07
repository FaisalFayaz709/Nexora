import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, DecimalStringSchema, PageQuerySchema, UuidSchema } from '../common';
export const ProductMasterContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_FUNCTIONAL_SPEC' as const;
export const ProductListQuerySchema = PageQuerySchema.extend({ categoryId: UuidSchema.optional() });
export const CreateProductSchema = z.object({
  categoryId: UuidSchema, sku: z.string().min(1).max(80), name: z.string().min(1).max(200), unitId: UuidSchema,
  trackingType: z.string().min(1).max(50), brand: z.string().max(120).nullable().optional(), model: z.string().max(120).nullable().optional(),
  barcode: z.string().max(120).nullable().optional(), standardCost: DecimalStringSchema.nullable().optional(), salesPrice: DecimalStringSchema.nullable().optional(),
  minStock: DecimalStringSchema.nullable().optional(), maxStock: DecimalStringSchema.nullable().optional(),
});
export const UpdateProductSchema = CreateProductSchema.omit({ sku: true }).partial().refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');
export const ProductDataSchema = z.object({
  id: UuidSchema, categoryId: UuidSchema, sku: z.string(), name: z.string(), unitId: UuidSchema, trackingType: z.string(),
  brand: z.string().nullable(), model: z.string().nullable(), barcode: z.string().nullable(), standardCost: DecimalStringSchema.nullable(),
  salesPrice: DecimalStringSchema.nullable(), minStock: DecimalStringSchema.nullable(), maxStock: DecimalStringSchema.nullable(),
});
export const ProductResponseSchema = apiDataEnvelope(ProductDataSchema);
export const ProductListResponseSchema = apiListEnvelope(ProductDataSchema);
