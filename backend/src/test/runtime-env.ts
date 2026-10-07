export const RUNTIME_TEST_ENV_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'NEXORA_API_BASE_URL',
] as const;

export type RuntimeTestEnvKey = (typeof RUNTIME_TEST_ENV_KEYS)[number];

export function isRuntimeIntegrationEnabled() {
  return process.env.RUN_INTEGRATION_TESTS === '1' || process.env.RUNTIME_CERTIFICATION === '1';
}

export function isFinalRuntimeCertification() {
  return process.env.RUNTIME_CERTIFICATION === '1';
}

export function requireRuntimeEnv(keys: readonly RuntimeTestEnvKey[] = RUNTIME_TEST_ENV_KEYS) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Runtime test environment is missing: ${missing.join(', ')}`);
  }
}

export function runtimeBaseUrl() {
  const value = process.env.NEXORA_API_BASE_URL;
  if (!value) throw new Error('NEXORA_API_BASE_URL is required for API runtime tests.');
  return value.replace(/\/$/, '');
}

export function runtimeTestTimeout(defaultMs = 30_000) {
  const parsed = Number(process.env.RUNTIME_TEST_TIMEOUT_MS ?? defaultMs);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMs;
}
