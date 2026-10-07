import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, IsoDateSchema, NonEmptyStringSchema, UuidSchema } from '../common';
import { InvoiceStatusSchema } from '../../schemas';

export const CreateCustomerInvoiceContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreateCustomerInvoiceRequestSchema = z.object({
  customerId: UuidSchema,
  projectId: UuidSchema,
  issueDate: IsoDateSchema,
  dueDate: IsoDateSchema,
  items: z.array(
    z.object({
      description: NonEmptyStringSchema,
      quantity: DecimalStringSchema,
      unitPrice: DecimalStringSchema,
      taxRate: DecimalStringSchema,
    }),
  ),
});

export const CreateCustomerInvoiceDataSchema = z.object({
  id: UuidSchema,
  invoiceNo: NonEmptyStringSchema,
  status: InvoiceStatusSchema,
  total: DecimalStringSchema,
});

export const CreateCustomerInvoiceResponseSchema = apiDataEnvelope(
  CreateCustomerInvoiceDataSchema,
);
