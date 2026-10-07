import type { FastifyReply } from 'fastify';

export const PASS_21_SECURITY_HEADERS_POLICY = 'PASS_21_SECURITY_HEADERS_POLICY' as const;

export interface SecurityHeaderPolicyOptions {
  readonly production: boolean;
  readonly allowFraming?: boolean;
  readonly cspReportOnly?: boolean;
}

export const NEXORA_CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
] as const;

export function buildContentSecurityPolicy(): string {
  return NEXORA_CSP_DIRECTIVES.join('; ');
}

export function applySecurityHeaders(reply: FastifyReply, options: SecurityHeaderPolicyOptions): void {
  reply.header('x-content-type-options', 'nosniff');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('x-permitted-cross-domain-policies', 'none');
  reply.header('cross-origin-opener-policy', 'same-origin');
  reply.header('cross-origin-resource-policy', 'same-origin');
  reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  reply.header('x-frame-options', options.allowFraming ? 'SAMEORIGIN' : 'DENY');
  reply.header(options.cspReportOnly ? 'content-security-policy-report-only' : 'content-security-policy', buildContentSecurityPolicy());

  if (options.production) {
    reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
}

export function assertSecurityHeadersApplied(headers: Record<string, string | string[] | undefined>, production: boolean): void {
  const required = [
    'x-content-type-options',
    'referrer-policy',
    'x-frame-options',
    'content-security-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
    'permissions-policy',
  ];
  for (const header of required) {
    if (!headers[header]) throw new Error(`PASS_21_SECURITY_HEADER_MISSING: ${header}`);
  }
  if (production && !headers['strict-transport-security']) {
    throw new Error('PASS_21_SECURITY_HEADER_MISSING: strict-transport-security');
  }
}
