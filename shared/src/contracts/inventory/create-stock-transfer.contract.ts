import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, NonEmptyStringSchema, UuidSchema } from '../common';

export const CreateStockTransferContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreateStockTransferRequestSchema = z.object({
  fromWarehouseId: UuidSchema,
  toWarehouseId: UuidSchema,
  items: z.array(
    z.object({
      productId: UuidSchema,
      quantity: DecimalStringSchema,
    }),
  ),
});

export const CreateStockTransferDataSchema = z.object({
  id: UuidSchema,
  transferNo: NonEmptyStringSchema,
  status: z.literal('DRAFT'),
});

export const CreateStockTransferResponseSchema = apiDataEnvelope(
  CreateStockTransferDataSchema,
);
