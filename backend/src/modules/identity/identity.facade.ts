import type { FastifyRequest } from 'fastify';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { TokenService } from '../../core/security/token.service.js';
import type { SessionService } from './session.service.js';
import type { TenantResolutionService } from './tenant-resolution.service.js';
import type { AuthorizationService } from './authorization.service.js';

export class IdentityFacade {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly tenantResolution: TenantResolutionService,
    private readonly authorization: AuthorizationService,
  ) {}

  async authenticateRequest(request: FastifyRequest): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_ACCESS_TOKEN_REQUIRED', 'A bearer access token is required.');
    }

    let claims: { userId: string; sessionId: string };
    try {
      claims = await this.tokenService.verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      throw new AppError(401, 'AUTH_ACCESS_TOKEN_INVALID', 'Access token is invalid or expired.');
    }

    await this.sessionService.assertActive(claims.userId, claims.sessionId);
    request.auth = claims;
  }

  async resolveTenantRequest(request: FastifyRequest): Promise<void> {
    if (!request.auth) {
      throw new AppError(401, 'AUTH_ACCESS_TOKEN_REQUIRED', 'Authentication must run before tenant resolution.');
    }

    const requested = request.headers['x-organization-id'];
    const organizationId = Array.isArray(requested) ? requested[0] : requested;

    request.tenant = await this.tenantResolution.resolve(
      request.auth.userId,
      organizationId,
    );
  }

  async assertPermission(
    request: FastifyRequest,
    permission: string,
  ): Promise<void> {
    if (!request.auth || !request.tenant) {
      throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
    }

    await this.authorization.assertPermission(
      request.auth.userId,
      request.tenant,
      permission,
    );
  }

  userHasActiveMembership(userId: string, organizationId: string): Promise<boolean> {
    return this.tenantResolution.userHasActiveMembership(userId, organizationId);
  }

  async permissions(
    userId: string,
    tenant: TenantRequestContext,
  ): Promise<string[]> {
    return this.authorization.permissions(userId, tenant);
  }

  async roleIds(
    userId: string,
    tenant: TenantRequestContext,
  ): Promise<string[]> {
    return this.authorization.roleIds(userId, tenant);
  }

  roleBelongsToOrganization(roleId: string, organizationId: string): Promise<boolean> {
    return this.authorization.roleBelongsToOrganization(roleId, organizationId);
  }
}
