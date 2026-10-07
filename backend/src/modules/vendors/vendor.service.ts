import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { OrganizationFacade } from '../organization/index.js';
import { VendorRepository } from './vendor.repository.js';

export class VendorService {
  constructor(
    private readonly organization: Pick<OrganizationFacade, 'addressBelongsToOrganization'>,
    private readonly repository = new VendorRepository(),
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
    return { ...result, page, pageSize };
  }

  async get(tenant: TenantRequestContext, id: string) {
    const row = await this.repository.get(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
    return row;
  }

  async create(tenant: TenantRequestContext, actor: any, input: any) {
    await this.assertAddress(tenant.organizationId, input.billingAddressId);
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.create({
        organizationId: tenant.organizationId,
        code: input.code,
        name: input.name,
        taxNo: input.taxNo ?? null,
        paymentTerms: input.paymentTerms ?? null,
        billingAddressId: input.billingAddressId ?? null,
      });
      if (input.primaryContact) {
        await repo.createContact({
          vendorId: row.id,
          name: input.primaryContact.name,
          email: input.primaryContact.email ?? null,
          phone: input.primaryContact.phone ?? null,
          isPrimary: true,
        });
      }
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'VENDOR_CREATED',
        subjectType: 'Vendor',
        subjectId: row.id,
        afterJson: row,
        ip: actor.ip,
      });
      return row;
    });
  }

  async update(tenant: TenantRequestContext, actor: any, id: string, input: any) {
    const before = await this.get(tenant, id);
    await this.assertAddress(tenant.organizationId, input.billingAddressId);
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.updateScoped(tenant.organizationId, id, input);
      if (!row) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
      }
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'VENDOR_UPDATED',
        subjectType: 'Vendor',
        subjectId: id,
        beforeJson: before,
        afterJson: row,
        ip: actor.ip,
      });
      const { organizationId: _organizationId, ...out } = row;
      return out;
    });
  }

  async performance(tenant: TenantRequestContext, id: string) {
    await this.get(tenant, id);
    const row = await this.repository.latestPerformance(id);
    return {
      vendorId: id,
      period: row?.period ?? null,
      onTimePct: row?.onTimePct?.toString() ?? null,
      rejectPct: row?.rejectPct?.toString() ?? null,
      score: row?.score?.toString() ?? null,
    };
  }


  async purchaseOrders(tenant: TenantRequestContext, id: string, query: any) {
    await this.get(tenant, id);
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const [rows, total] = await this.repository.listPurchaseOrders({
      organizationId: tenant.organizationId,
      vendorId: id,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      rows: rows.map((row: any) => ({
        id: row.id,
        poNo: row.poNo,
        status: row.status,
        orderDate: row.orderDate,
        expectedDate: row.expectedDate,
        total: row.total.toString(),
        itemCount: row.items?.length ?? 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async blacklist(tenant: TenantRequestContext, actor: any, id: string, input: { reason: string; riskScore: number }) {
    const before = await this.get(tenant, id);
    if (before.status === 'BLACKLISTED') {
      throw new AppError(409, 'VENDOR_ALREADY_BLACKLISTED', 'Vendor is already blacklisted.');
    }
    return withTransaction(async (tx) => {
      const updated = await this.repository.blacklist(tx, {
        organizationId: tenant.organizationId,
        vendorId: id,
        reason: input.reason,
        riskScore: input.riskScore,
      });
      if (updated.organizationId !== tenant.organizationId) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
      }
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'VENDOR_BLACKLISTED',
        subjectType: 'Vendor',
        subjectId: id,
        beforeJson: before,
        afterJson: {
          status: updated.status,
          riskRating: updated.riskRating,
          riskScore: updated.riskScore,
          blacklistReason: updated.blacklistReason,
        },
        ip: actor.ip,
      });
      const { organizationId: _organizationId, ...out } = updated;
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
        'VENDOR_ADDRESS_INVALID',
        'Billing address does not belong to the active organization.',
      );
    }
  }
}
