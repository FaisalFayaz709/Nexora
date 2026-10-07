import { z } from 'zod';

export const RequestMetaSchema = z.object({
  requestId: z.string().min(1),
});

export const ListMetaSchema = RequestMetaSchema.extend({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const ApiErrorBodySchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
  requestId: z.string().min(1),
});

export const ApiErrorSchema = z.object({
  error: ApiErrorBodySchema,
});

export const apiDataEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: RequestMetaSchema,
  });

export const apiListEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: ListMetaSchema,
  });

export type RequestMeta = z.infer<typeof RequestMetaSchema>;
export type ListMeta = z.infer<typeof ListMetaSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
