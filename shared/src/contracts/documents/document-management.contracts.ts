import { z } from 'zod';
import { PageQuerySchema, UuidSchema } from '../common';

export const DocumentListQuerySchema = PageQuerySchema.extend({
  subjectType: z.string().max(120).optional(),
  subjectId: UuidSchema.optional(),
  category: z.string().max(80).optional(),
});
export const CreateDocumentSchema = z.object({
  subjectType: z.string().min(1).max(120),
  subjectId: UuidSchema.optional(),
  title: z.string().min(1).max(240),
  category: z.string().min(1).max(80),
  fileName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().min(32).max(128),
  objectKey: z.string().min(1).max(500),
});
export const UploadIntentSchema = z.object({
  subjectType: z.string().min(1).max(120),
  subjectId: UuidSchema.optional(),
  fileName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  category: z.string().min(1).max(80),
});
export const CompleteUploadSchema = CreateDocumentSchema;
export const AddDocumentVersionSchema = CreateDocumentSchema.omit({ subjectType: true, subjectId: true, title: true, category: true });
