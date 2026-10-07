import { z } from 'zod';
import {
  DecimalStringSchema,
  IsoDateSchema,
  NonEmptyStringSchema,
  UuidSchema,
} from '../common';

export const PurchaseContractContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_APPENDIX_F_PURCHASE_CONTRACT_LOCKED_ROUTE_SEMANTICS' as const;

export const PurchaseContractStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'CLOSED',
  'CANCELLED',
]);

export const PurchaseReleaseOrderStatusSchema = z.enum([
  'CREATED',
  'CANCELLED',
  'FULFILLED',
]);

export const BlanketPurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'CLOSED',
  'CANCELLED',
]);

const PurchaseContractItemInputSchema = z.object({
  productId: UuidSchema,
  agreedRate: DecimalStringSchema.refine((value) => Number(value) >= 0, 'agreedRate cannot be negative'),
  maxQuantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'maxQuantity must be positive').optional(),
  maxValue: DecimalStringSchema.refine((value) => Number(value) > 0, 'maxValue must be positive').optional(),
}).superRefine((value, ctx) => {
  if (!value.maxQuantity && !value.maxValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Each contract item requires maxQuantity or maxValue.',
    });
  }
});

export const CreatePurchaseContractSchema = z.object({
  vendorId: UuidSchema,
  branchId: UuidSchema.nullable().optional(),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  maxValue: DecimalStringSchema.refine((value) => Number(value) > 0, 'maxValue must be positive').optional(),
  terms: z.record(z.unknown()).optional(),
  notes: z.string().max(4000).optional(),
  items: z.array(PurchaseContractItemInputSchema).min(1),
}).refine(
  (value) => new Date(value.endDate).getTime() >= new Date(value.startDate).getTime(),
  'Contract endDate cannot precede startDate.',
);

export const ApprovePurchaseContractSchema = z.object({
  comment: z.string().max(1000).nullable().optional(),
});

export const CreatePurchaseReleaseOrderSchema = z.object({
  expectedDate: IsoDateSchema,
  notes: z.string().max(4000).optional(),
  items: z.array(z.object({
    contractItemId: UuidSchema,
    quantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'quantity must be positive'),
  })).min(1),
});

export const PurchaseContractDataSchema = z.object({
  id: UuidSchema,
  contractNo: NonEmptyStringSchema,
  vendorId: UuidSchema,
  status: PurchaseContractStatusSchema,
});

export const PurchaseReleaseOrderDataSchema = z.object({
  id: UuidSchema,
  releaseOrderNo: NonEmptyStringSchema,
  purchaseContractId: UuidSchema,
  status: PurchaseReleaseOrderStatusSchema,
  totalValue: DecimalStringSchema,
});


export const BlanketPurchaseOrderDataSchema = z.object({
  id: UuidSchema,
  blanketPoNo: NonEmptyStringSchema,
  purchaseContractId: UuidSchema,
  vendorId: UuidSchema,
  status: BlanketPurchaseOrderStatusSchema,
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  maxValue: DecimalStringSchema.optional(),
  releasedValue: DecimalStringSchema,
});

export const BlanketPurchaseOrderItemDataSchema = z.object({
  id: UuidSchema,
  blanketPurchaseOrderId: UuidSchema,
  purchaseContractItemId: UuidSchema.nullable().optional(),
  productId: UuidSchema,
  agreedRate: DecimalStringSchema,
  maxQuantity: DecimalStringSchema.nullable().optional(),
  releasedQuantity: DecimalStringSchema,
  maxValue: DecimalStringSchema.nullable().optional(),
  releasedValue: DecimalStringSchema,
});
