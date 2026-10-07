import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, DecimalStringSchema, PageQuerySchema, UuidSchema } from '../common';
export const CustomerMasterContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_LOCKED_ROUTE_SEMANTICS' as const;
export const CustomerListQuerySchema = PageQuerySchema;
export const UpdateCustomerSchema = z.object({
  name: z.string().min(2).max(200).optional(), taxNo: z.string().max(80).nullable().optional(),
  billingAddressId: UuidSchema.nullable().optional(), creditLimit: DecimalStringSchema.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');
export const CustomerDataSchema = z.object({
  id: UuidSchema, code: z.string(), name: z.string(), taxNo: z.string().nullable(),
  billingAddressId: UuidSchema.nullable(), creditLimit: DecimalStringSchema.nullable(), status: z.string(),
});
export const CustomerResponseSchema = apiDataEnvelope(CustomerDataSchema);
export const CustomerListResponseSchema = apiListEnvelope(CustomerDataSchema);
