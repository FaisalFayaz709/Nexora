import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, PageQuerySchema, UuidSchema } from '../common';
export const VendorContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_FUNCTIONAL_SPEC' as const;
export const VendorListQuerySchema = PageQuerySchema;
export const VendorPurchaseOrdersQuerySchema = PageQuerySchema;
export const BlacklistVendorSchema = z.object({ reason: z.string().min(1).max(1000), riskScore: z.number().int().min(0).max(100).default(100) });
export const CreateVendorSchema = z.object({
  code: z.string().min(1).max(50), name: z.string().min(1).max(200), taxNo: z.string().max(80).nullable().optional(),
  paymentTerms: z.string().max(200).nullable().optional(), billingAddressId: UuidSchema.nullable().optional(),
  primaryContact: z.object({ name: z.string().min(1).max(200), email: z.string().email().nullable().optional(), phone: z.string().max(80).nullable().optional() }).optional(),
});
export const UpdateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(), taxNo: z.string().max(80).nullable().optional(),
  paymentTerms: z.string().max(200).nullable().optional(), billingAddressId: UuidSchema.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');
export const VendorDataSchema = z.object({
  id: UuidSchema, code: z.string(), name: z.string(), taxNo: z.string().nullable(), paymentTerms: z.string().nullable(),
  billingAddressId: UuidSchema.nullable(), status: z.string(),
});
export const VendorPerformanceDataSchema = z.object({ vendorId: UuidSchema, period: z.string().nullable(), onTimePct: z.string().nullable(), rejectPct: z.string().nullable(), score: z.string().nullable() });
export const VendorResponseSchema = apiDataEnvelope(VendorDataSchema);
export const VendorListResponseSchema = apiListEnvelope(VendorDataSchema);
export const VendorPurchaseOrderDataSchema = z.object({ id: UuidSchema, poNo: z.string(), status: z.string(), orderDate: z.string().or(z.date()), expectedDate: z.string().or(z.date()), total: z.string(), itemCount: z.number().int() });
export const VendorPerformanceResponseSchema = apiDataEnvelope(VendorPerformanceDataSchema);
