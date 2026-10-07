import type { FastifyRequest } from 'fastify';
import { AppError } from '../http/errors.js';
import type { TenantRequestContext } from '../tenant/tenant-context.js';

export interface AuthenticatedActorContext {
  readonly userId: string;
  readonly sessionId: string;
}

export interface AuthorizedRequestContext {
  readonly actor: AuthenticatedActorContext;
  readonly tenant: TenantRequestContext;
  readonly requestId: string;
  readonly ip: string | null;
}

/**
 * Locked blueprint rule: controllers/services must not guess tenant or actor
 * context from the request body. Authentication and tenant resolution must
 * have executed before any business command enters a domain service.
 */
export function requireAuthorizedContext(request: FastifyRequest): AuthorizedRequestContext {
  if (!request.auth || !request.tenant) {
    throw new AppError(
      500,
      'AUTH_PIPELINE_INVALID',
      'Authentication, tenant resolution and authorization must run before the handler.',
    );
  }

  return {
    actor: {
      userId: request.auth.userId,
      sessionId: request.auth.sessionId,
    },
    tenant: request.tenant,
    requestId: request.id,
    ip: request.ip ?? null,
  };
}

export function requireTenantContext(request: FastifyRequest): TenantRequestContext {
  if (!request.tenant) {
    throw new AppError(
      500,
      'TENANT_CONTEXT_REQUIRED',
      'Tenant context must be resolved before accessing tenant-owned data.',
    );
  }
  return request.tenant;
}

export function requireActorContext(request: FastifyRequest): AuthenticatedActorContext {
  if (!request.auth) {
    throw new AppError(401, 'AUTH_ACCESS_TOKEN_REQUIRED', 'Authentication is required.');
  }
  return request.auth;
}
