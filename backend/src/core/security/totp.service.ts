import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';


function encodeBase32(value: Buffer): string {
  let bits = '';
  for (const byte of value) bits += byte.toString(2).padStart(8, '0');

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)]!;
  }

  return output;
}

function decodeBase32(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/=+$/u, '').replace(/\s+/gu, '');
  let bits = '';

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

function constantTimeCodeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export class TotpService {
  constructor(private readonly encryptionKey: Buffer) {
    if (encryptionKey.length !== 32) throw new Error('TOTP encryption key must be 32 bytes');
  }


  generateSecret(byteLength = 20): string {
    if (byteLength < 16) throw new Error('TOTP secret must contain at least 16 random bytes');
    return encodeBase32(randomBytes(byteLength));
  }

  encryptSecret(secret: string): string {
    const normalized = secret.toUpperCase().replace(/=+$/u, '').replace(/\s+/gu, '');
    decodeBase32(normalized);

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const payload = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv, tag, payload].map((item) => item.toString('base64url')).join('.');
  }

  verifyEncryptedSecret(encryptedSecret: string, code: string, now = Date.now()): boolean {
    return this.verify(encryptedSecret, code, now);
  }

  decryptSecret(encrypted: string): string {
    const [ivEncoded, tagEncoded, payloadEncoded] = encrypted.split('.');
    if (!ivEncoded || !tagEncoded || !payloadEncoded) throw new Error('Malformed encrypted TOTP secret');

    const iv = Buffer.from(ivEncoded, 'base64url');
    const tag = Buffer.from(tagEncoded, 'base64url');
    const payload = Buffer.from(payloadEncoded, 'base64url');

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
  }

  verify(encryptedSecret: string, code: string, now = Date.now()): boolean {
    if (!/^\d{6}$/u.test(code)) return false;

    const secret = decodeBase32(this.decryptSecret(encryptedSecret));
    const counter = Math.floor(now / 1000 / 30);

    for (const offset of [-1, 0, 1]) {
      if (constantTimeCodeEquals(hotp(secret, counter + offset), code)) return true;
    }

    return false;
  }
}
