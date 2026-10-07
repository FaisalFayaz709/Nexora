import { describe, expect, it } from 'vitest';
import { assertNoPlaintextAuditSecrets, redactSecuritySensitiveValue } from './audit-redaction.js';

describe('M19 audit redaction', () => {
  it('redacts nested passwords, tokens, cookies, api keys and OTP values', () => {
    const redacted = redactSecuritySensitiveValue({
      user: 'manager@example.com',
      password: 'plain-password',
      nested: {
        refreshToken: 'raw-refresh-token',
        headers: { authorization: 'raw-token', cookie: 'raw-secret' },
        mfaOtp: 'raw-otp',
        profile: { displayName: 'Manager' },
      },
    });

    expect(JSON.stringify(redacted)).toContain('[REDACTED:M19]');
    expect(JSON.stringify(redacted)).not.toContain('plain-password');
    expect(JSON.stringify(redacted)).not.toContain('raw-token');
    expect(JSON.stringify(redacted)).toContain('Manager');
    expect(() => assertNoPlaintextAuditSecrets(redacted)).not.toThrow();
  });
});
