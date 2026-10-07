export interface ProcessorResult {
  readonly status: 'processed' | 'deferred' | 'skipped';
  readonly reason?: string;
  readonly idempotencyKey?: string;
  readonly referenceId?: string;
  readonly producedAt: string;
}

export function processed(referenceId: string, idempotencyKey?: string): ProcessorResult {
  return withOptional({ status: 'processed', referenceId, producedAt: new Date().toISOString() }, idempotencyKey);
}

export function deferred(reason: string, idempotencyKey?: string): ProcessorResult {
  return withOptional({ status: 'deferred', reason, producedAt: new Date().toISOString() }, idempotencyKey);
}

export function skipped(reason: string, idempotencyKey?: string): ProcessorResult {
  return withOptional({ status: 'skipped', reason, producedAt: new Date().toISOString() }, idempotencyKey);
}

function withOptional(result: Omit<ProcessorResult, 'idempotencyKey'>, idempotencyKey: string | undefined): ProcessorResult {
  if (idempotencyKey) return { ...result, idempotencyKey };
  return result;
}
