import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { OrganizationService } from './organization.service.js';
import type { OrganizationRepository } from './organization.repository.js';

export class OrganizationFacade {
  constructor(
    private readonly service: OrganizationService,
    private readonly repository: OrganizationRepository,
  ) {}

  getBranch(tenant: TenantRequestContext, id: string) {
    return this.service.getBranch(tenant, id);
  }

  getDepartment(tenant: TenantRequestContext, id: string) {
    return this.service.getDepartment(tenant, id);
  }

  branchExists(organizationId: string, branchId: string) {
    return this.repository.branchExists(organizationId, branchId);
  }

  addressBelongsToOrganization(organizationId: string, addressId: string) {
    return this.repository.addressBelongsToOrganization(organizationId, addressId);
  }
}
