import { describe, expect, it } from 'vitest';
import { assertCsrfForCookieMutation, signCsrfToken } from './csrf-policy.js';

describe('PASS 21 CSRF policy', () => {
  it('allows non-mutating requests without CSRF token', () => {
    expect(() => assertCsrfForCookieMutation({ method: 'GET', cookieHeader: 'nexora_refresh=x' })).not.toThrow();
  });

  it('blocks cookie-authenticated mutations without matching CSRF token', () => {
    expect(() => assertCsrfForCookieMutation({ method: 'POST', cookieHeader: 'nexora_refresh=x' })).toThrow('CSRF_TOKEN_REQUIRED');
  });

  it('accepts a matching signed CSRF token', () => {
    const token = signCsrfToken('session-1', 'secret');
    expect(() => assertCsrfForCookieMutation({ method: 'PATCH', cookieHeader: `nexora_refresh=x; nexora_csrf=${token}`, headerToken: token, sessionId: 'session-1', csrfSecret: 'secret' })).not.toThrow();
  });
});
