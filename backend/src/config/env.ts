import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  REDIS_URL: z.string().url().default('redis://redis:6379'),

  MINIO_ENDPOINT: z.string().url().default('http://minio:9000'),
  MINIO_ACCESS_KEY: z.string().min(1).default('nexora-local'),
  MINIO_SECRET_KEY: z.string().min(8).default('change-me-local-only'),
  MINIO_PRIVATE_BUCKET: z.string().min(3).max(63).default('nexora-private'),
  MINIO_PUBLIC_BUCKET: z.string().min(3).max(63).default('nexora-public'),
  MINIO_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(900),
  MINIO_DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(300),
  DOCUMENT_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(50 * 1024 * 1024),
  DOCUMENT_ENFORCE_OBJECT_CHECKSUM: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
  AUTH_MFA_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default('nexora_refresh'),
  AUTH_BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  AUTH_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(128).default(12),

  AUTH_LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_MFA_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  AUTH_MFA_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_LOCKOUT_SECONDS: z.coerce.number().int().positive().default(900),

  OPENAPI_DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  AUTH_MFA_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        return Buffer.from(value, 'base64').length === 32;
      } catch {
        return false;
      }
    }, 'AUTH_MFA_ENCRYPTION_KEY must decode to exactly 32 bytes'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return EnvSchema.parse(source);
}
