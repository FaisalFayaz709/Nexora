import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export interface IssuedRefreshToken {
  readonly secret: string;
  readonly secretHash: string;
}

export function issueRefreshSecret(): IssuedRefreshToken {
  const secret = randomBytes(32).toString('base64url');
  return {
    secret,
    secretHash: hashRefreshSecret(secret),
  };
}

export function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function matchesRefreshSecret(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashRefreshSecret(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encodeRefreshCookie(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function decodeRefreshCookie(value: string): { sessionId: string; secret: string } {
  const dot = value.indexOf('.');
  if (dot <= 0 || dot === value.length - 1) {
    throw new Error('Malformed refresh cookie');
  }

  return {
    sessionId: value.slice(0, dot),
    secret: value.slice(dot + 1),
  };
}
