import { describe, expect, it } from 'vitest';
import {
  decodeRefreshCookie,
  encodeRefreshCookie,
  issueRefreshSecret,
  matchesRefreshSecret,
} from './refresh-token.js';

describe('refresh token rotation primitives', () => {
  it('stores only a hash and validates the raw secret', () => {
    const issued = issueRefreshSecret();
    expect(issued.secret).not.toBe(issued.secretHash);
    expect(matchesRefreshSecret(issued.secret, issued.secretHash)).toBe(true);
  });

  it('encodes session id separately from the refresh secret', () => {
    const value = encodeRefreshCookie('session-id', 'secret');
    expect(decodeRefreshCookie(value)).toEqual({
      sessionId: 'session-id',
      secret: 'secret',
    });
  });
});
