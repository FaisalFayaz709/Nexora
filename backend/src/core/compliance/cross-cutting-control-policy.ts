import { AppError } from '../http/errors.js';
import type { TenantRequestContext } from '../tenant/tenant-context.js';

export const CROSS_CUTTING_CONTROL_KEYS = Object.freeze([
  'locked-route-catalog',
  'authentication',
  'tenant-resolution',
  'module-entitlement',
  'permission-check',
  'resource-scope',
  'shared-contract-validation',
  'state-transition-policy',
  'transaction-boundary',
  'audit-log',
  'idempotency',
  'stable-error-envelope',
] as const);

export type CrossCuttingControlKey = (typeof CROSS_CUTTING_CONTROL_KEYS)[number];

export const MUTATING_HTTP_METHODS = Object.freeze(['POST', 'PUT', 'PATCH', 'DELETE'] as const);
export type MutatingHttpMethod = (typeof MUTATING_HTTP_METHODS)[number];

export const HIGH_RISK_COMMAND_SUFFIXES = Object.freeze([
  '/submit',
  '/approve',
  '/reject',
  '/cancel',
  '/send',
  '/receive',
  '/inspect',
  '/post',
  '/pay',
  '/allocate',
  '/issue',
  '/return',
  '/adjust',
  '/reconcile',
  '/install',
  '/replace',
  '/retire',
  '/complete',
  '/close',
] as const);

export interface CrossCuttingCommandPolicyInput {
  readonly method: string;
  readonly route: string;
  readonly permission?: string | null;
  readonly tenant: TenantRequestContext;
  readonly body?: unknown;
  readonly idempotencyKey?: string | null;
  readonly requiresIdempotency?: boolean;
  readonly requiresAudit?: boolean;
  readonly requiresTransaction?: boolean;
}

export interface CrossCuttingCommandDecision {
  readonly mutating: boolean;
  readonly highRiskCommand: boolean;
  readonly requiredControls: readonly CrossCuttingControlKey[];
  readonly idempotencyRouteKey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectClientTenantOverrideKeys(value: unknown, prefix = ''): string[] {
  if (!isRecord(value)) return [];

  const forbidden = new Set(['organizationId', 'orgId', 'tenantId']);
  const found: string[] = [];

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (forbidden.has(key)) found.push(path);
    if (isRecord(child)) found.push(...collectClientTenantOverrideKeys(child, path));
    if (Array.isArray(child)) {
      child.forEach((item, index) => {
        found.push(...collectClientTenantOverrideKeys(item, `${path}[${index}]`));
      });
    }
  }

  return found;
}

export function isMutatingMethod(method: string): method is MutatingHttpMethod {
  return MUTATING_HTTP_METHODS.includes(method.toUpperCase() as MutatingHttpMethod);
}

export function isHighRiskCommandRoute(route: string): boolean {
  return HIGH_RISK_COMMAND_SUFFIXES.some((suffix) => route.endsWith(suffix) || route.includes(`${suffix}/`));
}

export function normalizeIdempotencyRouteKey(method: string, route: string): string {
  return `${method.toUpperCase()} ${route.replace(/\/[0-9a-fA-F-]{32,36}(?=\/|$)/g, '/:id')}`;
}

export function assertNoClientTenantOverride(body: unknown): void {
  const forbiddenKeys = collectClientTenantOverrideKeys(body);
  if (forbiddenKeys.length > 0) {
    throw new AppError(
      400,
      'CLIENT_TENANT_OVERRIDE_FORBIDDEN',
      'Client payload must not provide organization or tenant identifiers; they are resolved from authentication context.',
      { forbiddenKeys },
    );
  }
}

export function assertTenantScopedWhere(
  where: Record<string, unknown>,
  subjectType: string,
): void {
  if (!('organizationId' in where) || typeof where.organizationId !== 'string' || where.organizationId.length === 0) {
    throw new AppError(
      500,
      'TENANT_FILTER_REQUIRED',
      `${subjectType} repository access must include organizationId tenant scope.`,
    );
  }
}

export class CrossCuttingControlPolicy {
  evaluate(input: CrossCuttingCommandPolicyInput): CrossCuttingCommandDecision {
    if (!input.tenant.organizationId) {
      throw new AppError(500, 'TENANT_CONTEXT_REQUIRED', 'Tenant context is required for protected business operations.');
    }

    assertNoClientTenantOverride(input.body);

    const mutating = isMutatingMethod(input.method);
    const highRiskCommand = mutating && isHighRiskCommandRoute(input.route);

    if (mutating && input.permission === undefined) {
      throw new AppError(
        500,
        'PERMISSION_CONTROL_REQUIRED',
        'Mutating routes must declare an explicit permission or an explicit public exemption.',
      );
    }

    if ((input.requiresIdempotency || highRiskCommand) && !input.idempotencyKey) {
      throw new AppError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'This command requires an Idempotency-Key header to prevent duplicate business effects.',
      );
    }

    const requiredControls: CrossCuttingControlKey[] = [
      'locked-route-catalog',
      'authentication',
      'tenant-resolution',
      'permission-check',
      'resource-scope',
      'shared-contract-validation',
      'stable-error-envelope',
    ];

    if (mutating) requiredControls.push('audit-log');
    if (highRiskCommand || input.requiresTransaction) requiredControls.push('state-transition-policy', 'transaction-boundary');
    if (highRiskCommand || input.requiresIdempotency) requiredControls.push('idempotency');

    return Object.freeze({
      mutating,
      highRiskCommand,
      requiredControls: Object.freeze([...new Set(requiredControls)]),
      idempotencyRouteKey: normalizeIdempotencyRouteKey(input.method, input.route),
    });
  }
}
