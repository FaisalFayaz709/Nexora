import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { requireTenantContext } from '../request/authenticated-context.js';

export interface AuthenticationBoundary {
  authenticateRequest(request: FastifyRequest): Promise<void>;
  resolveTenantRequest(request: FastifyRequest): Promise<void>;
  assertPermission(request: FastifyRequest, permission: string): Promise<void>;
}

export interface ModuleAccessBoundary {
  assertModuleEnabled(organizationId: string, moduleKey: string): Promise<void>;
}

export interface RouteGuardOptions {
  readonly identity: AuthenticationBoundary;
  readonly permission?: string | null;
  readonly access?: ModuleAccessBoundary | null;
  readonly moduleKey?: string | null;
  readonly extra?: readonly preHandlerHookHandler[];
}

/**
 * Standard Fastify pre-handler pipeline for protected NEXORA routes:
 * authenticate -> resolve tenant -> module enabled -> permission -> extra guards.
 *
 * Domain modules may still add resource-specific guards in services, but this
 * helper makes the cross-cutting route guard sequence explicit and reusable.
 */
export function createRouteGuard(options: RouteGuardOptions): preHandlerHookHandler[] {
  const guard: preHandlerHookHandler[] = [
    options.identity.authenticateRequest.bind(options.identity),
    options.identity.resolveTenantRequest.bind(options.identity),
  ];

  if (options.access && options.moduleKey) {
    guard.push(async (request) => {
      const tenant = requireTenantContext(request);
      await options.access!.assertModuleEnabled(tenant.organizationId, options.moduleKey!);
    });
  }

  if (options.permission) {
    guard.push(async (request) => {
      await options.identity.assertPermission(request, options.permission!);
    });
  }

  if (options.extra?.length) guard.push(...options.extra);
  return guard;
}
