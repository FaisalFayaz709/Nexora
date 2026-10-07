import { z } from 'zod';
import { apiDataEnvelope, DecimalStringSchema, IsoDateSchema, NonEmptyStringSchema, UuidSchema } from '../common';
import { ProjectStatusSchema } from '../../schemas';

export const CreateProjectContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const CreateProjectRequestSchema = z.object({
  customerId: UuidSchema,
  contractId: UuidSchema,
  siteId: UuidSchema,
  name: NonEmptyStringSchema,
  managerId: UuidSchema,
  startDate: IsoDateSchema,
  dueDate: IsoDateSchema,
  contractValue: DecimalStringSchema,
});

export const CreateProjectDataSchema = z.object({
  id: UuidSchema,
  projectNo: NonEmptyStringSchema,
  status: ProjectStatusSchema,
});

export const CreateProjectResponseSchema = apiDataEnvelope(CreateProjectDataSchema);
