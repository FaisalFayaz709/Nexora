import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, IsoDateTimeSchema, NonEmptyStringSchema, UuidSchema } from '../common';

export const CreatePaymentContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreatePaymentRequestSchema = z.object({
  direction: z.literal('INBOUND'),
  partyType: z.literal('CUSTOMER'),
  partyId: UuidSchema,
  amount: DecimalStringSchema,
  method: z.literal('BANK_TRANSFER'),
  paidAt: IsoDateTimeSchema,
  allocations: z.array(
    z.object({
      invoiceId: UuidSchema,
      amount: DecimalStringSchema,
    }),
  ),
});

export const CreatePaymentDataSchema = z.object({
  id: UuidSchema,
  paymentNo: NonEmptyStringSchema,
  status: z.literal('POSTED'),
});

export const CreatePaymentResponseSchema = apiDataEnvelope(CreatePaymentDataSchema);
