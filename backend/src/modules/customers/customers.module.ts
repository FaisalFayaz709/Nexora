import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { OrganizationFacade } from '../organization/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { CustomerController } from './customer.controller.js';
import { customerRoutes } from './customer.routes.js';
import { CustomerService } from './customer.service.js';
import { CustomerSiteController } from './customer-site.controller.js';
import { customerSiteRoutes } from './customer-site.routes.js';
import { CustomerSiteService } from './customer-site.service.js';

export function createCustomersModule(
  identity: IdentityFacade,
  organization: OrganizationFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  return async (app) => {
    const customerService = new CustomerService(organization);
    const siteService = new CustomerSiteService(organization);
    await app.register(customerRoutes(new CustomerController(customerService), identity, access));
    await app.register(customerSiteRoutes(new CustomerSiteController(siteService), identity, access));
  };
}
