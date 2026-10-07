import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.string().url().default('redis://redis:6379'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(5),
  WORKER_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  WORKER_JOB_BACKOFF_MS: z.coerce.number().int().min(100).max(600_000).default(5_000),
  WORKER_REMOVE_COMPLETE_AGE_SECONDS: z.coerce.number().int().min(60).default(86_400),
  WORKER_REMOVE_FAILED_AGE_SECONDS: z.coerce.number().int().min(60).default(604_800),
  WORKER_SCHEDULERS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  WORKER_EMAIL_DELIVERY_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  WORKER_WEBHOOK_DELIVERY_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type WorkerConfig = z.infer<typeof EnvSchema>;

export function readWorkerConfig(source: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return EnvSchema.parse(source);
}
