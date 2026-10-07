import { describe, expect, it } from 'vitest';
import { API_BASE_PATH } from '../../constants/api';
import { LOCKED_ENDPOINTS, requireLockedEndpoint } from './locked-endpoints';

describe('locked endpoint registry', () => {
  it('contains the complete Pass 0 route catalog', () => {
    expect(LOCKED_ENDPOINTS).toHaveLength(268);
  });

  it('has no duplicate method/path signatures', () => {
    const signatures = LOCKED_ENDPOINTS.map((entry) => `${entry.method} ${entry.endpoint}`);
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('keeps every endpoint under /api/v1', () => {
    for (const entry of LOCKED_ENDPOINTS) expect(entry.endpoint.startsWith(API_BASE_PATH)).toBe(true);
  });

  it('rejects a non-spec endpoint', () => {
    expect(() => requireLockedEndpoint('GET', '/api/v1/not-in-spec')).toThrow();
  });
});
