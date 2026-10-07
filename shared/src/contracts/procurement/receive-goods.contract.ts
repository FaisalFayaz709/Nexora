import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, IsoDateTimeSchema, NonEmptyStringSchema, UuidSchema } from '../common';
import { GoodsReceiptStatusSchema } from '../../schemas';

export const ReceiveGoodsContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const ReceiveGoodsRequestSchema = z.object({
  purchaseOrderId: UuidSchema,
  warehouseId: UuidSchema,
  receivedAt: IsoDateTimeSchema,
  items: z.array(
    z.object({
      purchaseOrderItemId: UuidSchema,
      receivedQty: DecimalStringSchema,
      acceptedQty: DecimalStringSchema,
      damagedQty: DecimalStringSchema,
      serialNumbers: z.array(NonEmptyStringSchema),
    }),
  ),
});

export const ReceiveGoodsDataSchema = z.object({
  id: UuidSchema,
  grnNo: NonEmptyStringSchema,
  status: GoodsReceiptStatusSchema,
  stockTransactions: z.array(UuidSchema),
});

export const ReceiveGoodsResponseSchema = apiDataEnvelope(ReceiveGoodsDataSchema);
