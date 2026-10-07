import { describe, expect, it } from 'vitest';
import { TotpService } from './totp.service.js';

describe('totp enrollment primitives', () => {
  const service = new TotpService(Buffer.alloc(32, 7));

  it('generates a base32 secret and stores only encrypted form', () => {
    const secret = service.generateSecret();
    const encrypted = service.encryptSecret(secret);

    expect(secret).toMatch(/^[A-Z2-7]+$/u);
    expect(encrypted).not.toContain(secret);
    expect(service.decryptSecret(encrypted)).toBe(secret);
  });

  it('rejects invalid base32 secrets before encryption', () => {
    expect(() => service.encryptSecret('not valid !!!')).toThrow();
  });
});
