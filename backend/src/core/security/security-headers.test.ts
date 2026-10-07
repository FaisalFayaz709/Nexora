import { describe, expect, it } from 'vitest';
import { assertSecurityHeadersApplied, buildContentSecurityPolicy } from './security-headers.js';

describe('PASS 21 security headers', () => {
  it('builds CSP without allowing foreign script origins', () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('*');
  });

  it('requires production HSTS evidence', () => {
    expect(() => assertSecurityHeadersApplied({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'content-security-policy': buildContentSecurityPolicy(),
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'permissions-policy': 'camera=()'
    }, true)).toThrow('strict-transport-security');
  });
});
