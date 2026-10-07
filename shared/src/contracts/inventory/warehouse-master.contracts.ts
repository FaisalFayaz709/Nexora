import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, PageQuerySchema, UuidSchema } from '../common';
export const WarehouseMasterContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_FUNCTIONAL_SPEC' as const;
export const WarehouseListQuerySchema = PageQuerySchema.extend({ branchId: UuidSchema.optional() });
export const CreateWarehouseSchema = z.object({ branchId: UuidSchema, code: z.string().min(1).max(50), name: z.string().min(1).max(200) });
export const UpdateWarehouseSchema = z.object({ name: z.string().min(1).max(200).optional() }).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');
export const WarehouseDataSchema = z.object({ id: UuidSchema, branchId: UuidSchema, code: z.string(), name: z.string(), status: z.string() });
export const WarehouseResponseSchema = apiDataEnvelope(WarehouseDataSchema);
export const WarehouseListResponseSchema = apiListEnvelope(WarehouseDataSchema);
