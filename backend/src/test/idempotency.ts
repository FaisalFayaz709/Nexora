import { randomUUID } from 'node:crypto';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

export function makeIdempotencyKey(scope: string) {
  const normalized = scope.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '');
  return `${normalized || 'runtime'}-${randomUUID()}`;
}

export async function retrySameCommand<T>(command: (idempotencyKey: string) => Promise<T>, scope: string) {
  const key = makeIdempotencyKey(scope);
  const first = await command(key);
  const second = await command(key);
  return { key, first, second };
}
