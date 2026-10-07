import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AssignRoleSchema,
  CreateRoleSchema,
  CreateTenantUserSchema,
  LoginRequestSchema,
  MfaVerifyRequestSchema,
  PERMISSION_KEYS,
  ReplaceRolePermissionsSchema,
  TenantUserListQuerySchema,
  UpdateRoleSchema,
  UpdateTenantUserStatusSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import type { AppEnv } from '../../config/env.js';
import type { AuthenticationService } from './authentication.service.js';
import type { SessionService } from './session.service.js';
import type { IdentityFacade } from './identity.facade.js';
import type { IdentityProfileService } from './identity-profile.service.js';
import type { RoleService } from './role.service.js';
import type { UserManagementService } from './user-management.service.js';

export class IdentityController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly sessionService: SessionService,
    private readonly profileService: IdentityProfileService,
    private readonly facade: IdentityFacade,
    private readonly userManagementService: UserManagementService,
    private readonly roleService: RoleService,
    private readonly env: AppEnv,
  ) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = LoginRequestSchema.parse(request.body);
    const result = await this.authService.login(input, this.requestContext(request));

    if (result.kind === 'MFA_REQUIRED') {
      return reply.code(200).send(
        dataEnvelope(
          {
            requiresMfa: true,
            mfaChallengeToken: result.challengeToken,
            user: result.user,
          },
          request.id,
        ),
      );
    }

    this.setRefreshCookie(reply, result.refreshCookie);
    return reply.code(200).send(
      dataEnvelope(
        {
          accessToken: result.accessToken,
          requiresMfa: false,
          user: result.user,
        },
        request.id,
      ),
    );
  };

  verifyMfa = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = MfaVerifyRequestSchema.parse(request.body);
    const result = await this.authService.verifyMfa(input, this.requestContext(request));

    this.setRefreshCookie(reply, result.refreshCookie);
    return reply.code(200).send(
      dataEnvelope(
        {
          accessToken: result.accessToken,
          requiresMfa: false,
          user: result.user,
        },
        request.id,
      ),
    );
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const cookie = request.cookies[this.env.AUTH_REFRESH_COOKIE_NAME];
    if (!cookie) {
      throw new AppError(401, 'AUTH_REFRESH_REQUIRED', 'Refresh session cookie is required.');
    }

    const result = await this.authService.refresh(cookie);
    this.setRefreshCookie(reply, result.refreshCookie);

    return reply.code(200).send(
      dataEnvelope({ accessToken: result.accessToken }, request.id),
    );
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    await this.sessionService.revokeOwn(auth.userId, auth.sessionId, request.ip);
    this.clearRefreshCookie(reply);
    return reply.code(200).send(dataEnvelope({ revoked: true }, request.id));
  };

  logoutAll = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const revokedCount = await this.sessionService.revokeAll(auth.userId, request.ip);
    this.clearRefreshCookie(reply);
    return reply.code(200).send(
      dataEnvelope({ revoked: true, revokedCount }, request.id),
    );
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const requested = request.headers['x-organization-id'];
    const organizationId = Array.isArray(requested) ? requested[0] : requested;

    return reply.code(200).send(
      dataEnvelope(
        await this.profileService.me({
          userId: auth.userId,
          tenant: request.tenant,
          requestedOrganizationId: organizationId,
        }),
        request.id,
      ),
    );
  };

  sessions = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const sessions = await this.sessionService.list(auth.userId, auth.sessionId);
    return reply.code(200).send(
      listEnvelope(sessions, {
        page: 1,
        pageSize: sessions.length || 1,
        total: sessions.length,
        requestId: request.id,
      }),
    );
  };

  revokeSession = async (
    request: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply,
  ) => {
    const auth = this.requireAuth(request);
    await this.sessionService.revokeOwn(
      auth.userId,
      request.params.sessionId,
      request.ip,
    );

    if (request.params.sessionId === auth.sessionId) this.clearRefreshCookie(reply);

    return reply.code(200).send(dataEnvelope({ revoked: true }, request.id));
  };


  listUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = this.requireTenant(request);
    const query = TenantUserListQuerySchema.parse(request.query);
    const result = await this.userManagementService.listUsers(tenant, query);
    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  getUser = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const tenant = this.requireTenant(request);
    const user = await this.userManagementService.getUser(tenant, request.params.id);
    return reply.code(200).send(dataEnvelope(user, request.id));
  };

  createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = CreateTenantUserSchema.parse(request.body);
    const user = await this.userManagementService.createUser({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      email: input.email,
      password: input.password,
      branchId: input.branchId ?? null,
      roleIds: input.roleIds,
    });
    return reply.code(201).send(dataEnvelope(user, request.id));
  };

  updateUser = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = UpdateTenantUserStatusSchema.parse(request.body);
    const user = await this.userManagementService.setUserStatus({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      membershipId: request.params.id,
      status: input.status,
    });
    return reply.code(200).send(dataEnvelope(user, request.id));
  };

  listRoles = async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = this.requireTenant(request);
    const roles = await this.roleService.listRoles(tenant);
    return reply.code(200).send(
      listEnvelope(roles, {
        page: 1,
        pageSize: roles.length || 1,
        total: roles.length,
        requestId: request.id,
      }),
    );
  };

  createRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = CreateRoleSchema.parse(request.body);
    const role = await this.roleService.createRole({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      name: input.name,
      mfaRequired: input.mfaRequired,
      permissionKeys: input.permissionKeys,
    });
    return reply.code(201).send(dataEnvelope(role, request.id));
  };

  updateRole = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = UpdateRoleSchema.parse(request.body);
    const role = await this.roleService.updateMfaRequirement({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      roleId: request.params.id,
      mfaRequired: input.mfaRequired ?? false,
    });
    return reply.code(200).send(dataEnvelope(role, request.id));
  };

  replaceRolePermissions = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = ReplaceRolePermissionsSchema.parse(request.body);
    await this.roleService.replacePermissions({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      roleId: request.params.id,
      permissionKeys: input.permissionKeys,
    });
    return reply.code(200).send(dataEnvelope({ updated: true }, request.id));
  };

  assignRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = this.requireAuth(request);
    const tenant = this.requireTenant(request);
    const input = AssignRoleSchema.parse(request.body);
    await this.roleService.assignRole({
      tenant,
      actorUserId: auth.userId,
      actorIp: request.ip,
      membershipId: input.membershipId,
      roleId: input.roleId,
    });
    return reply.code(200).send(dataEnvelope({ assigned: true }, request.id));
  };

  listPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
    const rows = await this.roleService.listPermissions();
    const knownKeys = new Set(PERMISSION_KEYS);
    const permissions = rows.map((row) => ({
      id: row.id,
      key: row.key,
      description: row.description,
      knownInSharedCatalog: knownKeys.has(row.key as never),
    }));
    return reply.code(200).send(
      listEnvelope(permissions, {
        page: 1,
        pageSize: permissions.length || 1,
        total: permissions.length,
        requestId: request.id,
      }),
    );
  };

  private requestContext(request: FastifyRequest) {
    return {
      ip: request.ip,
      device: request.headers['user-agent'] ?? null,
    };
  }

  private requireAuth(request: FastifyRequest) {
    if (!request.auth) {
      throw new AppError(401, 'AUTH_ACCESS_TOKEN_REQUIRED', 'Authentication is required.');
    }
    return request.auth;
  }


  private requireTenant(request: FastifyRequest) {
    if (!request.tenant) {
      throw new AppError(500, 'TENANT_CONTEXT_REQUIRED', 'Tenant context was not resolved for this request.');
    }
    return request.tenant;
  }

  private setRefreshCookie(reply: FastifyReply, value: string) {
    reply.setCookie(this.env.AUTH_REFRESH_COOKIE_NAME, value, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: this.env.AUTH_SESSION_TTL_SECONDS,
    });
  }

  private clearRefreshCookie(reply: FastifyReply) {
    reply.clearCookie(this.env.AUTH_REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }
}
