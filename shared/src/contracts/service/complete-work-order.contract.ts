import { z } from 'zod';
import { apiDataEnvelope, IsoDateTimeSchema, UuidSchema } from '../common';

export const CompleteWorkOrderContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CompleteWorkOrderRequestSchema = z.object({
  serviceReportId: UuidSchema,
  customerConfirmed: z.boolean(),
});

export const CompleteWorkOrderDataSchema = z.object({
  id: UuidSchema,
  status: z.literal('CLOSED'),
  closedAt: IsoDateTimeSchema,
});

export const CompleteWorkOrderResponseSchema = apiDataEnvelope(
  CompleteWorkOrderDataSchema,
);
