import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { OrganizationController } from './organization.controller.js';

const listBranches = defineLockedRoute('GET', '/api/v1/branches');
const getBranch = defineLockedRoute('GET', '/api/v1/branches/:id');
const createBranch = defineLockedRoute('POST', '/api/v1/branches');
const updateBranch = defineLockedRoute('PATCH', '/api/v1/branches/:id');
const listDepartments = defineLockedRoute('GET', '/api/v1/departments');
const getDepartment = defineLockedRoute('GET', '/api/v1/departments/:id');
const createDepartment = defineLockedRoute('POST', '/api/v1/departments');
const updateDepartment = defineLockedRoute('PATCH', '/api/v1/departments/:id');

export function organizationRoutes(
  controller: OrganizationController,
  identity: IdentityFacade,
): FastifyPluginAsync {
  const protectedBy = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
  ];

  return async (app) => {
    app.get(listBranches.relativePath, { schema: listBranches.schema,
      preHandler: protectedBy('branch.view'),
      handler: controller.listBranches,
    });
    app.get(getBranch.relativePath, { schema: getBranch.schema,
      preHandler: protectedBy('branch.view'),
      handler: controller.getBranch,
    });
    app.post(createBranch.relativePath, { schema: createBranch.schema,
      preHandler: protectedBy('branch.create'),
      handler: controller.createBranch,
    });
    app.patch(updateBranch.relativePath, { schema: updateBranch.schema,
      preHandler: protectedBy('branch.update'),
      handler: controller.updateBranch,
    });

    app.get(listDepartments.relativePath, { schema: listDepartments.schema,
      preHandler: protectedBy('department.view'),
      handler: controller.listDepartments,
    });
    app.get(getDepartment.relativePath, { schema: getDepartment.schema,
      preHandler: protectedBy('department.view'),
      handler: controller.getDepartment,
    });
    app.post(createDepartment.relativePath, { schema: createDepartment.schema,
      preHandler: protectedBy('department.create'),
      handler: controller.createDepartment,
    });
    app.patch(updateDepartment.relativePath, { schema: updateDepartment.schema,
      preHandler: protectedBy('department.update'),
      handler: controller.updateDepartment,
    });
  };
}
