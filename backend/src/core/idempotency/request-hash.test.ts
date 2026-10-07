import { describe, expect, it } from 'vitest';
import { stableRequestHash } from './request-hash.js';

describe('stableRequestHash', () => {
  it('hashes object keys deterministically', () => {
    const left = stableRequestHash({ b: 2, a: { d: 4, c: 3 } });
    const right = stableRequestHash({ a: { c: 3, d: 4 }, b: 2 });
    expect(left).toBe(right);
  });

  it('changes when the business payload changes', () => {
    expect(stableRequestHash({ amount: '10.00' })).not.toBe(stableRequestHash({ amount: '11.00' }));
  });
});
