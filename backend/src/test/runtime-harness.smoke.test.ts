import { describe, expect, it } from 'vitest';
import { RuntimeApiClient } from './api-client.js';
import { runConcurrent } from './concurrency.js';
import { makeIdempotencyKey } from './idempotency.js';
import { isRuntimeIntegrationEnabled, requireRuntimeEnv } from './runtime-env.js';

const runIntegration = isRuntimeIntegrationEnabled();

describe('Pass R4 runtime test harness smoke', () => {
  it('builds deterministic idempotency keys', () => {
    const key = makeIdempotencyKey('Payment Posting');
    expect(key).toMatch(/^payment-posting-[0-9a-f-]{36}$/);
  });

  it('collects concurrent outcomes without hiding failures', async () => {
    const result = await runConcurrent(4, async (index) => {
      if (index === 0) return 'winner';
      throw new Error(`loser-${index}`);
    });
    expect(result.fulfilled).toEqual(['winner']);
    expect(result.rejected).toHaveLength(3);
  });

  it.runIf(runIntegration)('requires runtime environment before API/database scenarios execute', () => {
    requireRuntimeEnv(['DATABASE_URL', 'NEXORA_API_BASE_URL']);
  });

  it.runIf(runIntegration)('can call API readiness through the runtime API client', async () => {
    const client = new RuntimeApiClient();
    const response = await client.get('/api/v1/health/ready');
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });
});
