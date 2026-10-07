import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from '../common';

export const CreateCustomerContractMaturity = 'EXPLICIT_SHARED_ZOD_SCHEMA' as const;

/**
 * Customer master creation contract.
 * Tenant ownership is injected by the authenticated backend context; clients are
 * not allowed to send organizationId.
 */
export const CreateCustomerSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  taxNo: z.string().max(80).nullable().optional(),
  billingAddressId: UuidSchema.nullable().optional(),
  creditLimit: DecimalStringSchema.nullable().optional(),
  primaryContact: z
    .object({
      name: z.string().min(2).max(200),
      email: z.string().email().nullable().optional(),
      phone: z.string().min(7).max(80).nullable().optional(),
    })
    .optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
