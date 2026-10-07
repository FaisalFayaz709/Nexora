import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { AppError } from '../http/errors.js';

export const PASS_21_CSRF_POLICY = 'PASS_21_CSRF_POLICY' as const;
export const CSRF_HEADER_NAME = 'x-csrf-token' as const;
export const CSRF_COOKIE_NAME = 'nexora_csrf' as const;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join('='));
  }
  return out;
}

export function signCsrfToken(sessionId: string, secret: string): string {
  return createHmac('sha256', secret).update(sessionId, 'utf8').digest('base64url');
}

export function verifySignedCsrfToken(sessionId: string, csrfToken: string, secret: string): boolean {
  const expected = Buffer.from(signCsrfToken(sessionId, secret));
  const received = Buffer.from(csrfToken);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertCsrfForCookieMutation(input: {
  readonly method: string;
  readonly cookieHeader?: string;
  readonly headerToken?: string | string[];
  readonly sessionId?: string | null;
  readonly csrfSecret?: string | null;
}): void {
  if (!MUTATING_METHODS.has(input.method.toUpperCase())) return;
  const cookies = parseCookieHeader(input.cookieHeader);
  const hasSessionCookie = Boolean(cookies.nexora_refresh || cookies.nexora_session || input.sessionId);
  if (!hasSessionCookie) return;

  const headerToken = Array.isArray(input.headerToken) ? input.headerToken[0] : input.headerToken;
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    throw new AppError(403, 'CSRF_TOKEN_REQUIRED', 'Cookie-authenticated mutations require a valid CSRF token.');
  }

  if (input.sessionId && input.csrfSecret && !verifySignedCsrfToken(input.sessionId, headerToken, input.csrfSecret)) {
    throw new AppError(403, 'CSRF_TOKEN_INVALID', 'CSRF token signature is invalid.');
  }
}

export function createCsrfPreHandler(options: { readonly csrfSecret: string }): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    assertCsrfForCookieMutation({
      method: request.method,
      cookieHeader: request.headers.cookie,
      headerToken: request.headers[CSRF_HEADER_NAME],
      sessionId: request.auth?.sessionId ?? null,
      csrfSecret: options.csrfSecret,
    });
  };
}
