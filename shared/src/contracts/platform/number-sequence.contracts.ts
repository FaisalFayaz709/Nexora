import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, PageQuerySchema, UuidSchema } from '../common';
export const NumberSequenceContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_APPENDIX_F_FIELDS_AND_LOCKED_ROUTE_SEMANTICS' as const;
export const NumberSequenceListQuerySchema = PageQuerySchema.extend({
  entityType: z.string().max(100).optional(), branchId: UuidSchema.optional(), fiscalYear: z.coerce.number().int().min(1900).max(9999).optional(),
});
export const CreateNumberSequenceSchema = z.object({
  branchId: UuidSchema.nullable().optional(), entityType: z.string().min(1).max(100), prefix: z.string().max(80),
  fiscalYear: z.number().int().min(1900).max(9999), startNumber: z.number().int().nonnegative().default(0),
  padding: z.number().int().min(1).max(20), resetPolicy: z.string().min(1).max(80),
});
export const ResetNumberSequenceSchema = z.object({ reason: z.string().min(1).max(500) });
export const NumberSequenceDataSchema = z.object({
  id: UuidSchema, branchId: UuidSchema.nullable(), entityType: z.string(), prefix: z.string(), fiscalYear: z.number().int(),
  currentNumber: z.string(), padding: z.number().int(), resetPolicy: z.string(), lockedAt: z.string().datetime({ offset: true }).nullable(),
});
export const NumberSequenceResponseSchema = apiDataEnvelope(NumberSequenceDataSchema);
export const NumberSequenceListResponseSchema = apiListEnvelope(NumberSequenceDataSchema);
