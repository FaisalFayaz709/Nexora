import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { OrganizationFacade } from '../organization/index.js';
import { CustomerRepository } from './customer.repository.js';

function dto(row: any) {
  return {
    ...row,
    creditLimit: row.creditLimit === null ? null : row.creditLimit.toString(),
  };
}

export class CustomerService {
  constructor(
    private readonly organization: Pick<OrganizationFacade, 'addressBelongsToOrganization'>,
    private readonly repository = new CustomerRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async list(tenant: TenantRequestContext, query: any) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const result = await this.repository.list(
      tenant.organizationId,
      (page - 1) * pageSize,
      pageSize,
    );
    return { rows: result.rows.map(dto), total: result.total, page, pageSize };
  }

  async get(tenant: TenantRequestContext, id: string) {
    const row = await this.repository.get(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    return dto(row);
  }

  async create(tenant: TenantRequestContext, actor: any, input: any) {
    if (
      input.billingAddressId &&
      !(await this.organization.addressBelongsToOrganization(
        tenant.organizationId,
        input.billingAddressId,
      ))
    ) {
      throw new AppError(
        400,
        'CUSTOMER_ADDRESS_INVALID',
        'Billing address does not belong to the active organization.',
      );
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const customer = await repo.create({
        organizationId: tenant.organizationId,
        code: input.code,
        name: input.name,
        taxNo: input.taxNo ?? null,
        billingAddressId: input.billingAddressId ?? null,
        creditLimit:
          input.creditLimit === undefined || input.creditLimit === null
            ? null
            : new Prisma.Decimal(input.creditLimit),
      });
      if (input.primaryContact) {
        await repo.createContact({
          customerId: customer.id,
          name: input.primaryContact.name,
          email: input.primaryContact.email ?? null,
          phone: input.primaryContact.phone ?? null,
          isPrimary: true,
        });
      }
      const result = dto(customer);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'CUSTOMER_CREATED',
        subjectType: 'Customer',
        subjectId: customer.id,
        afterJson: result,
        ip: actor.ip,
      });
      return result;
    });
  }

  async timeline(tenant: TenantRequestContext, id: string) {
    await this.get(tenant, id);
    return this.repository.timeline(tenant.organizationId, id);
  }

  async update(tenant: TenantRequestContext, actor: any, id: string, input: any) {
    const before = await this.get(tenant, id);
    if (
      input.billingAddressId &&
      !(await this.organization.addressBelongsToOrganization(
        tenant.organizationId,
        input.billingAddressId,
      ))
    ) {
      throw new AppError(
        400,
        'CUSTOMER_ADDRESS_INVALID',
        'Billing address does not belong to the active organization.',
      );
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.updateScoped(tenant.organizationId, id, {
        ...input,
        creditLimit:
          input.creditLimit === undefined
            ? undefined
            : input.creditLimit === null
              ? null
              : new Prisma.Decimal(input.creditLimit),
      });
      if (!row) {
        throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
      }
      const result = dto(row);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'CUSTOMER_UPDATED',
        subjectType: 'Customer',
        subjectId: id,
        beforeJson: before,
        afterJson: result,
        ip: actor.ip,
      });
      const { organizationId: _organizationId, ...out } = result;
      return out;
    });
  }
}
