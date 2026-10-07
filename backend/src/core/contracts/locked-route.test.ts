import { describe, expect, it } from 'vitest';
import { defineLockedRoute } from './locked-route.js';

describe('defineLockedRoute', () => {
  it('returns the base-relative path for a catalogued endpoint', () => {
    expect(defineLockedRoute('GET', '/api/v1/health/live').relativePath).toBe(
      '/health/live',
    );
  });

  it('rejects endpoints not present in the locked catalog', () => {
    expect(() => defineLockedRoute('GET', '/api/v1/invented')).toThrow();
  });
});
