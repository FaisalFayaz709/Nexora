import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, PageQuerySchema, UuidSchema } from '../common';
export const CustomerSiteContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_LOCKED_ROUTE_SEMANTICS' as const;
export const CustomerSiteListQuerySchema = PageQuerySchema.extend({ customerId: UuidSchema.optional() });
export const CreateCustomerSiteSchema = z.object({
  customerId: UuidSchema, code: z.string().min(1).max(50), name: z.string().min(1).max(200),
  addressId: UuidSchema.nullable().optional(),
});
export const UpdateCustomerSiteSchema = CreateCustomerSiteSchema.omit({ customerId: true, code: true }).partial().refine(
  (value) => Object.keys(value).length > 0, 'At least one editable field is required',
);
export const CustomerSiteDataSchema = z.object({
  id: UuidSchema, customerId: UuidSchema, code: z.string(), name: z.string(), addressId: UuidSchema.nullable(),
});
export const CustomerSiteResponseSchema = apiDataEnvelope(CustomerSiteDataSchema);
export const CustomerSiteListResponseSchema = apiListEnvelope(CustomerSiteDataSchema);
