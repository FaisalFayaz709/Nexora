import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  DecimalStringSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import {
  GoodsReceiptStatusSchema,
  PurchaseOrderStatusSchema,
  PurchaseRequestStatusSchema,
  RFQStatusSchema,
} from '../../schemas';

export const ProcurementContractsMaturity =
  'MIXED_SOURCE_EXAMPLE_AND_IMPLEMENTATION_DERIVED_FROM_LOCKED_ROUTE_SEMANTICS' as const;

export const ProcurementListQuerySchema = PageQuerySchema;

export const UpdatePurchaseRequestSchema = z.object({
  requiredDate: IsoDateSchema.optional(),
  reason: NonEmptyStringSchema.optional(),
  items: z.array(z.object({
    productId: UuidSchema,
    quantity: DecimalStringSchema.refine(v => Number(v) > 0),
    estimatedUnitPrice: DecimalStringSchema.refine(v => Number(v) >= 0),
  })).min(1).optional(),
}).refine(v => Object.keys(v).length > 0, 'At least one editable field is required');

export const PurchaseRequestCommandSchema = z.object({ comment: NonEmptyStringSchema });
export const RejectPurchaseRequestSchema = z.object({ comment: NonEmptyStringSchema });

export const CreateRfqFromPurchaseRequestSchema = z.object({ closesAt: IsoDateTimeSchema });

export const CreateRfqSchema = z.object({
  purchaseRequestId: UuidSchema,
  closesAt: IsoDateTimeSchema,
});
export const InviteVendorsSchema = z.object({ vendorIds: z.array(UuidSchema).min(1) });

export const CreateSupplierQuotationSchema = z.object({
  rfqId: UuidSchema,
  vendorId: UuidSchema,
  quoteRef: NonEmptyStringSchema,
  validity: IsoDateSchema,
  paymentTerms: z.string().max(500).nullable().optional(),
  items: z.array(z.object({
    productId: UuidSchema,
    quantity: DecimalStringSchema.refine(v => Number(v) > 0),
    unitPrice: DecimalStringSchema.refine(v => Number(v) >= 0),
    deliveryDays: z.number().int().nonnegative(),
    warrantyMonths: z.number().int().nonnegative(),
  })).min(1),
});
export const SelectQuotationSchema = z.object({ comment: NonEmptyStringSchema.optional() });

export const CreatePurchaseOrderSchema = z.object({
  supplierQuotationId: UuidSchema,
  expectedDate: IsoDateSchema,
});
export const PurchaseOrderCommandSchema = z.object({ comment: NonEmptyStringSchema.optional() });
export const CancelPurchaseOrderSchema = z.object({ reason: NonEmptyStringSchema });

export const InspectGoodsReceiptSchema = z.object({
  result: z.enum(['ACCEPTED','PARTIALLY_ACCEPTED','REJECTED']),
  notes: z.string().max(2000).nullable().optional(),
});

export const PurchaseRequestDataSchema = z.object({
  id: UuidSchema, prNo: z.string(), branchId: UuidSchema, projectId: UuidSchema,
  requiredDate: IsoDateSchema, status: PurchaseRequestStatusSchema,
});
export const RfqDataSchema = z.object({
  id: UuidSchema, rfqNo: z.string(), purchaseRequestId: UuidSchema,
  closesAt: IsoDateTimeSchema, status: RFQStatusSchema,
});
export const PurchaseOrderDataSchema = z.object({
  id: UuidSchema, poNo: z.string(), vendorId: UuidSchema,
  supplierQuotationId: UuidSchema.nullable(), orderDate: IsoDateSchema,
  expectedDate: IsoDateSchema, status: PurchaseOrderStatusSchema, total: DecimalStringSchema,
});
export const GoodsReceiptDataSchema = z.object({
  id: UuidSchema, grnNo: z.string(), purchaseOrderId: UuidSchema,
  warehouseId: UuidSchema, receivedAt: IsoDateTimeSchema, status: GoodsReceiptStatusSchema,
});

export const PurchaseRequestResponseSchema = apiDataEnvelope(PurchaseRequestDataSchema);
export const PurchaseRequestListResponseSchema = apiListEnvelope(PurchaseRequestDataSchema);
export const RfqResponseSchema = apiDataEnvelope(RfqDataSchema);
export const RfqListResponseSchema = apiListEnvelope(RfqDataSchema);
export const PurchaseOrderResponseSchema = apiDataEnvelope(PurchaseOrderDataSchema);
export const PurchaseOrderListResponseSchema = apiListEnvelope(PurchaseOrderDataSchema);
export const GoodsReceiptResponseSchema = apiDataEnvelope(GoodsReceiptDataSchema);
export const GoodsReceiptListResponseSchema = apiListEnvelope(GoodsReceiptDataSchema);


export const ReceiveGoodsCommandSchema = z.object({
  purchaseOrderId: UuidSchema,
  warehouseId: UuidSchema,
  receivedAt: IsoDateTimeSchema,
  items: z.array(z.object({
    purchaseOrderItemId: UuidSchema,
    receivedQty: DecimalStringSchema,
    acceptedQty: DecimalStringSchema,
    damagedQty: DecimalStringSchema,
    serialNumbers: z.array(NonEmptyStringSchema).default([]),
    batches: z.array(z.object({
      lotNo: NonEmptyStringSchema,
      quantity: DecimalStringSchema,
      manufactureDate: IsoDateSchema.nullable().optional(),
      expiryDate: IsoDateSchema.nullable().optional(),
    })).optional(),
  })).min(1),
});
