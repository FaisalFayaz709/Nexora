import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { OrganizationFacade } from '../organization/index.js';
import { CustomerSiteRepository } from './customer-site.repository.js';

export class CustomerSiteService {
  constructor(
    private readonly organization: Pick<OrganizationFacade, 'addressBelongsToOrganization'>,
    private readonly repository = new CustomerSiteRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async list(tenant: TenantRequestContext, query: any) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const result = await this.repository.list(
      tenant.organizationId,
      query.customerId,
      (page - 1) * pageSize,
      pageSize,
    );
    return { ...result, page, pageSize };
  }

  async get(tenant: TenantRequestContext, id: string) {
    const row = await this.repository.get(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'CUSTOMER_SITE_NOT_FOUND', 'Customer site not found.');
    return row;
  }

  async siteAssets(tenant: TenantRequestContext, id: string) {
    await this.get(tenant, id);
    return this.repository.siteAssets(tenant.organizationId, id);
  }

  async create(tenant: TenantRequestContext, actor: any, input: any) {
    if (!(await this.repository.customerExists(tenant.organizationId, input.customerId))) {
      throw new AppError(
        400,
        'CUSTOMER_SITE_CUSTOMER_INVALID',
        'Customer does not exist in the active organization.',
      );
    }
    await this.assertAddress(tenant.organizationId, input.addressId);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.create({
        organizationId: tenant.organizationId,
        customerId: input.customerId,
        code: input.code,
        name: input.name,
        addressId: input.addressId ?? null,
      });
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'CUSTOMER_SITE_CREATED',
        subjectType: 'CustomerSite',
        subjectId: row.id,
        afterJson: row,
        ip: actor.ip,
      });
      return row;
    });
  }

  async update(tenant: TenantRequestContext, actor: any, id: string, input: any) {
    const before = await this.get(tenant, id);
    await this.assertAddress(tenant.organizationId, input.addressId);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.updateScoped(tenant.organizationId, id, input);
      if (!row) {
        throw new AppError(404, 'CUSTOMER_SITE_NOT_FOUND', 'Customer site not found.');
      }
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'CUSTOMER_SITE_UPDATED',
        subjectType: 'CustomerSite',
        subjectId: id,
        beforeJson: before,
        afterJson: row,
        ip: actor.ip,
      });
      const { organizationId: _organizationId, ...out } = row;
      return out;
    });
  }

  private async assertAddress(organizationId: string, addressId?: string | null) {
    if (
      addressId &&
      !(await this.organization.addressBelongsToOrganization(organizationId, addressId))
    ) {
      throw new AppError(
        400,
        'CUSTOMER_SITE_ADDRESS_INVALID',
        'Site address does not belong to the active organization.',
      );
    }
  }
}
