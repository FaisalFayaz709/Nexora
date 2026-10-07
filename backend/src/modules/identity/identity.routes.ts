import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityController } from './identity.controller.js';
import type { IdentityFacade } from './identity.facade.js';

const login = defineLockedRoute('POST', '/api/v1/auth/login');
const mfaVerify = defineLockedRoute('POST', '/api/v1/auth/mfa/verify');
const refresh = defineLockedRoute('POST', '/api/v1/auth/refresh');
const logout = defineLockedRoute('POST', '/api/v1/auth/logout');
const logoutAll = defineLockedRoute('POST', '/api/v1/auth/logout-all');
const me = defineLockedRoute('GET', '/api/v1/auth/me');
const sessions = defineLockedRoute('GET', '/api/v1/auth/sessions');
const revokeSession = defineLockedRoute('DELETE', '/api/v1/auth/sessions/:sessionId');
const listUsers = defineLockedRoute('GET', '/api/v1/users');
const getUser = defineLockedRoute('GET', '/api/v1/users/:id');
const createUser = defineLockedRoute('POST', '/api/v1/users');
const updateUser = defineLockedRoute('PATCH', '/api/v1/users/:id');
const listRoles = defineLockedRoute('GET', '/api/v1/roles');
const createRole = defineLockedRoute('POST', '/api/v1/roles');
const updateRole = defineLockedRoute('PATCH', '/api/v1/roles/:id');
const replaceRolePermissions = defineLockedRoute('PUT', '/api/v1/roles/:id/permissions');
const assignRole = defineLockedRoute('POST', '/api/v1/users/roles');
const listPermissions = defineLockedRoute('GET', '/api/v1/permissions');

export function identityRoutes(
  controller: IdentityController,
  facade: IdentityFacade,
): FastifyPluginAsync {
  const protectedBy = (permission: string) => [
    facade.authenticateRequest.bind(facade),
    facade.resolveTenantRequest.bind(facade),
    (request: FastifyRequest) => facade.assertPermission(request, permission),
  ];

  return async (app) => {
    app.post(login.relativePath, { schema: login.schema, handler: controller.login });
    app.post(mfaVerify.relativePath, { schema: mfaVerify.schema, handler: controller.verifyMfa });
    app.post(refresh.relativePath, { schema: refresh.schema, handler: controller.refresh });

    app.post(logout.relativePath, { schema: logout.schema,
      preHandler: [facade.authenticateRequest.bind(facade)],
      handler: controller.logout,
    });

    app.post(logoutAll.relativePath, { schema: logoutAll.schema,
      preHandler: [facade.authenticateRequest.bind(facade)],
      handler: controller.logoutAll,
    });

    app.get(me.relativePath, { schema: me.schema,
      preHandler: [
        facade.authenticateRequest.bind(facade),
        async (request) => {
          // `/auth/me` may operate without an active tenant when the user has
          // multiple memberships; when a tenant can be resolved, attach it.
          try {
            await facade.resolveTenantRequest(request);
          } catch (error) {
            if (
              error instanceof Error &&
              'code' in error &&
              (error as { code?: string }).code === 'TENANT_CONTEXT_REQUIRED'
            ) {
              return;
            }
            throw error;
          }
        },
      ],
      handler: controller.me,
    });

    app.get(sessions.relativePath, { schema: sessions.schema,
      preHandler: [facade.authenticateRequest.bind(facade)],
      handler: controller.sessions,
    });

    app.delete(revokeSession.relativePath, { schema: revokeSession.schema,
      preHandler: [facade.authenticateRequest.bind(facade)],
      handler: controller.revokeSession,
    });

    app.get(listUsers.relativePath, {
      schema: listUsers.schema,
      preHandler: protectedBy('identity.user.view'),
      handler: controller.listUsers,
    });
    app.get(getUser.relativePath, {
      schema: getUser.schema,
      preHandler: protectedBy('identity.user.view'),
      handler: controller.getUser,
    });
    app.post(createUser.relativePath, {
      schema: createUser.schema,
      preHandler: protectedBy('identity.user.manage'),
      handler: controller.createUser,
    });
    app.patch(updateUser.relativePath, {
      schema: updateUser.schema,
      preHandler: protectedBy('identity.user.manage'),
      handler: controller.updateUser,
    });
    app.get(listRoles.relativePath, {
      schema: listRoles.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.listRoles,
    });
    app.post(createRole.relativePath, {
      schema: createRole.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.createRole,
    });
    app.patch(updateRole.relativePath, {
      schema: updateRole.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.updateRole,
    });
    app.put(replaceRolePermissions.relativePath, {
      schema: replaceRolePermissions.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.replaceRolePermissions,
    });
    app.post(assignRole.relativePath, {
      schema: assignRole.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.assignRole,
    });
    app.get(listPermissions.relativePath, {
      schema: listPermissions.schema,
      preHandler: protectedBy('identity.role.manage'),
      handler: controller.listPermissions,
    });

  };
}
