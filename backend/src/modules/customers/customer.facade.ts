import { AppError } from '../../core/http/errors.js';
import { CustomerRepository } from './customer.repository.js';
import { CustomerSiteRepository } from './customer-site.repository.js';

export class CustomerFacade {
  constructor(
    private readonly customers = new CustomerRepository(),
    private readonly sites = new CustomerSiteRepository(),
  ) {}

  async customerForProject(organizationId: string, customerId: string) {
    const row = await this.customers.get(organizationId, customerId);
    if (!row) {
      throw new AppError(400, 'PROJECT_CUSTOMER_INVALID', 'Customer does not belong to the active organization.');
    }
    return row;
  }

  async siteById(organizationId: string, siteId: string) {
    const row = await this.sites.get(organizationId, siteId);
    if (!row) {
      throw new AppError(404, 'CUSTOMER_SITE_NOT_FOUND', 'Customer site not found.');
    }
    return row;
  }

  async siteForProject(
    organizationId: string,
    customerId: string,
    siteId: string,
  ) {
    const row = await this.sites.get(organizationId, siteId);
    if (!row || row.customerId !== customerId) {
      throw new AppError(
        400,
        'PROJECT_SITE_INVALID',
        'Customer site does not belong to the selected customer in the active organization.',
      );
    }
    return row;
  }
  async areaForAsset(
    organizationId: string,
    siteId: string,
    areaId: string,
  ) {
    const row = await this.sites.areaForSite(organizationId, siteId, areaId);
    if (!row) {
      throw new AppError(
        400,
        'ASSET_AREA_INVALID',
        'Asset area does not belong to the selected customer site.',
      );
    }
    return row;
  }
}
