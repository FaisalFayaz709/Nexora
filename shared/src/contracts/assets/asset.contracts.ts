import { z } from 'zod';
import {
  DecimalStringSchema,
  IsoDateSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { AssetStatusSchema } from '../../schemas/status-models';

export const AssetContractMaturity =
  'INSTALL_SOURCE_EXAMPLE_PLUS_IMPLEMENTATION_DERIVED_LOCKED_ROUTE_CONTRACTS' as const;

export const AssetWarrantyStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRING',
  'EXPIRED',
  'VOID',
]);

export const AssetRmaStatusSchema = z.enum([
  'REQUESTED',
  'SUPPLIER_APPROVED',
  'SENT',
  'REPAIRED',
  'REPLACED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
]);

export const AssetListQuerySchema = PageQuerySchema.extend({
  status: AssetStatusSchema.optional(),
  customerId: UuidSchema.optional(),
  siteId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  productId: UuidSchema.optional(),
});

export const AssetSiteListQuerySchema = PageQuerySchema.extend({
  status: AssetStatusSchema.optional(),
  projectId: UuidSchema.optional(),
});

export const WarrantyInputSchema = z.object({
  vendorId: UuidSchema,
  startsAt: IsoDateSchema,
  expiresAt: IsoDateSchema,
  terms: z.string().max(4000).optional(),
  documentId: UuidSchema.nullable().optional(),
});

export const CreateAssetSchema = z.object({
  productId: UuidSchema,
  customerId: UuidSchema,
  siteId: UuidSchema,
  areaId: UuidSchema.nullable().optional(),
  projectId: UuidSchema,
  purchaseCost: DecimalStringSchema.nullable().optional(),
  supplierVendorId: UuidSchema.nullable().optional(),
  warranty: WarrantyInputSchema.optional(),
});

export const UpdateAssetSchema = z.object({
  customerId: UuidSchema.optional(),
  siteId: UuidSchema.optional(),
  areaId: UuidSchema.nullable().optional(),
  projectId: UuidSchema.optional(),
  purchaseCost: DecimalStringSchema.nullable().optional(),
  supplierVendorId: UuidSchema.nullable().optional(),
  warranty: WarrantyInputSchema.optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one editable asset field is required.',
);

export const RegisterAssetFromStockSchema = z.object({
  serialNo: z.string().min(1).max(200),
  customerId: UuidSchema,
  siteId: UuidSchema,
  areaId: UuidSchema.nullable().optional(),
  projectId: UuidSchema,
  purchaseCost: DecimalStringSchema.nullable().optional(),
  supplierVendorId: UuidSchema.nullable().optional(),
  warranty: WarrantyInputSchema.optional(),
});

export const InstallAssetSchema = z.object({
  siteId: UuidSchema,
  areaId: UuidSchema,
  projectId: UuidSchema,
  technicianId: UuidSchema,
  installedAt: z.string().datetime(),
  locationText: z.string().min(1).max(500),
  checklistId: UuidSchema.nullable().optional(),
});

export const ReplaceAssetSchema = z.object({
  replacementAssetId: UuidSchema,
  reason: z.string().min(1).max(2000).optional(),
});

export const RetireAssetSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export const CreateAssetRmaSchema = z.object({
  vendorId: UuidSchema,
  reason: z.string().min(1).max(2000),
});

export const RotateAssetQrSchema = z.object({
  ttlDays: z.number().int().min(1).max(3650).optional(),
});

export const AssetHistoryQuerySchema = PageQuerySchema.extend({
  eventType: z.string().min(1).max(120).optional(),
});
