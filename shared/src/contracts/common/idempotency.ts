import { z } from 'zod';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key' as const;
export const IdempotencyKeySchema = z.string().min(1);

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
