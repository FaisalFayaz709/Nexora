import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, IsoDateSchema, NonEmptyStringSchema, UuidSchema } from '../common';
import { PurchaseRequestStatusSchema } from '../../schemas';

export const CreatePurchaseRequestContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreatePurchaseRequestRequestSchema = z.object({
  projectId: UuidSchema,
  requiredDate: IsoDateSchema,
  reason: NonEmptyStringSchema,
  items: z.array(
    z.object({
      productId: UuidSchema,
      quantity: DecimalStringSchema,
      estimatedUnitPrice: DecimalStringSchema,
    }),
  ),
});

export const CreatePurchaseRequestDataSchema = z.object({
  id: UuidSchema,
  prNo: NonEmptyStringSchema,
  status: PurchaseRequestStatusSchema,
  items: z.array(z.unknown()),
});

export const CreatePurchaseRequestResponseSchema = apiDataEnvelope(CreatePurchaseRequestDataSchema);

export type CreatePurchaseRequestRequest = z.infer<typeof CreatePurchaseRequestRequestSchema>;
export type CreatePurchaseRequestResponse = z.infer<typeof CreatePurchaseRequestResponseSchema>;
