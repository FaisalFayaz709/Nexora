export const M19_AUDIT_SECRET_PII_REDACTION = 'M19_AUDIT_SECRET_PII_REDACTION' as const;

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passcode/i,
  /token/i,
  /refresh/i,
  /secret/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /csrf/i,
  /otp/i,
  /totp/i,
  /mfa/i,
  /signatureRaw/i,
  /documentRaw/i,
] as const;

const REDACTED = '[REDACTED:M19]';

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function redactSecuritySensitiveValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 8) return '[REDACTED:M19:MAX_DEPTH]';
  if (Array.isArray(value)) return value.map((entry) => redactSecuritySensitiveValue(entry, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactSecuritySensitiveValue(entry, depth + 1),
    ]),
  );
}

export function assertNoPlaintextAuditSecrets(value: unknown): void {
  const serialized = JSON.stringify(value ?? {});
  for (const marker of ['plain-password', 'raw-token', 'raw-refresh-token', 'raw-secret', 'raw-otp']) {
    if (serialized.includes(marker)) {
      throw new Error(`M19-AUDIT-SECRET-PII-REDACTION: plaintext secret marker leaked: ${marker}`);
    }
  }
}
