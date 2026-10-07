import { z } from 'zod';
import { apiDataEnvelope, NonEmptyStringSchema, UuidSchema } from '../common';
import { TicketStatusSchema } from '../../schemas';

export const CreateTicketContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreateTicketRequestSchema = z.object({
  customerId: UuidSchema,
  siteId: UuidSchema,
  assetId: UuidSchema,
  category: NonEmptyStringSchema,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  subject: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
});

export const CreateTicketDataSchema = z.object({
  id: UuidSchema,
  ticketNo: NonEmptyStringSchema,
  status: TicketStatusSchema,
  sla: z.unknown(),
});

export const CreateTicketResponseSchema = apiDataEnvelope(CreateTicketDataSchema);
