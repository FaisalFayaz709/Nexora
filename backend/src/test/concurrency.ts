export interface ConcurrentRunResult<T> {
  readonly settled: PromiseSettledResult<T>[];
  readonly fulfilled: T[];
  readonly rejected: unknown[];
}

export async function runConcurrent<T>(count: number, task: (index: number) => Promise<T>): Promise<ConcurrentRunResult<T>> {
  if (!Number.isInteger(count) || count < 1) throw new Error('runConcurrent count must be a positive integer.');
  const settled = await Promise.allSettled(Array.from({ length: count }, (_, index) => task(index)));
  const fulfilled = settled
    .filter((result): result is PromiseFulfilledResult<T> => result.status === 'fulfilled')
    .map((result) => result.value);
  const rejected = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason);
  return { settled, fulfilled, rejected };
}

export function expectSingleEffect<T>(result: ConcurrentRunResult<T>, effectName: string) {
  if (result.fulfilled.length !== 1) {
    throw new Error(`${effectName} expected exactly one successful effect, got ${result.fulfilled.length}.`);
  }
  if (result.rejected.length === 0) {
    throw new Error(`${effectName} expected competing attempts to be rejected or no-oped safely.`);
  }
}
