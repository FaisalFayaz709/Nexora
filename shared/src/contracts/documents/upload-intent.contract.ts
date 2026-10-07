import { z } from 'zod';
import { apiDataEnvelope, NonEmptyStringSchema, UuidSchema } from '../common';

export const UploadIntentContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const UploadIntentRequestSchema = z.object({
  fileName: NonEmptyStringSchema,
  mimeType: NonEmptyStringSchema,
  size: z.number().int().positive(),
  subjectType: NonEmptyStringSchema,
  subjectId: UuidSchema,
  category: NonEmptyStringSchema,
});

export const UploadIntentDataSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: NonEmptyStringSchema,
  expiresInSeconds: z.number().int().positive(),
});

export const UploadIntentResponseSchema = apiDataEnvelope(UploadIntentDataSchema);
