import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { OrganizationFacade } from '../organization/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { VendorOnboardingController } from './onboarding/vendor-onboarding.controller.js';
import { vendorOnboardingRoutes } from './onboarding/vendor-onboarding.routes.js';
import { VendorOnboardingService } from './onboarding/vendor-onboarding.service.js';
import { VendorController } from './vendor.controller.js';
import { vendorRoutes } from './vendor.routes.js';
import { VendorService } from './vendor.service.js';

export function createVendorsModule(
  identity: IdentityFacade,
  organization: OrganizationFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const service = new VendorService(organization);
  const onboarding = new VendorOnboardingService();
  return async (app) => {
    await app.register(vendorRoutes(new VendorController(service), identity, access));
    await app.register(vendorOnboardingRoutes(new VendorOnboardingController(onboarding), identity, access));
  };
}
