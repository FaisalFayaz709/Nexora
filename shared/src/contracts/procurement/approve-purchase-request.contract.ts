import { z } from 'zod';
import { apiDataEnvelope, NonEmptyStringSchema, UuidSchema } from '../common';

export const ApprovePurchaseRequestContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const ApprovePurchaseRequestRequestSchema = z.object({
  comment: NonEmptyStringSchema,
});

export const ApprovePurchaseRequestDataSchema = z.object({
  id: UuidSchema,
  status: z.literal('APPROVED'),
  approval: z.object({
    currentStep: z.null(),
    completed: z.literal(true),
  }),
});

export const ApprovePurchaseRequestResponseSchema = apiDataEnvelope(
  ApprovePurchaseRequestDataSchema,
);
