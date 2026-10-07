import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { VendorOnboardingController } from './vendor-onboarding.controller.js';
const create = defineLockedRoute('POST', '/api/v1/vendor-onboarding/requests');
const submit = defineLockedRoute('POST', '/api/v1/vendor-onboarding/:id/submit');
const approve = defineLockedRoute('POST', '/api/v1/vendor-onboarding/:id/approve');
export function vendorOnboardingRoutes(controller: VendorOnboardingController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [identity.authenticateRequest.bind(identity), identity.resolveTenantRequest.bind(identity), (request: FastifyRequest) => identity.assertPermission(request, permission), (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'vendors')];
  return async (app) => {
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('vendor.onboard'), handler: controller.create });
    app.post(submit.relativePath, { schema: submit.schema, preHandler: guard('vendor.onboard'), handler: controller.submit });
    app.post(approve.relativePath, { schema: approve.schema, preHandler: guard('vendor.risk.manage'), handler: controller.approve });
  };
}
