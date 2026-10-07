import { AppError } from '../http/errors.js';
import type { TenantRequestContext } from '../tenant/tenant-context.js';

export interface TenantOwnedRecord {
  readonly id?: string;
  readonly organizationId: string;
  readonly branchId?: string | null;
}

export function tenantWhere(tenant: TenantRequestContext) {
  return { organizationId: tenant.organizationId } as const;
}

export function tenantBranchWhere(tenant: TenantRequestContext) {
  return {
    organizationId: tenant.organizationId,
    ...(tenant.branchId ? { branchId: tenant.branchId } : {}),
  } as const;
}

export function assertTenantScope(
  tenant: TenantRequestContext,
  record: TenantOwnedRecord | null | undefined,
  subjectType: string,
): asserts record is TenantOwnedRecord {
  if (!record) {
    throw new AppError(404, `${subjectType.toUpperCase()}_NOT_FOUND`, `${subjectType} was not found.`);
  }

  if (record.organizationId !== tenant.organizationId) {
    throw new AppError(403, 'TENANT_SCOPE_VIOLATION', 'Record belongs to a different tenant.', {
      subjectType,
    });
  }
}

export function assertBranchScope(
  tenant: TenantRequestContext,
  record: TenantOwnedRecord,
  subjectType: string,
): void {
  assertTenantScope(tenant, record, subjectType);
  if (tenant.branchId && record.branchId && tenant.branchId !== record.branchId) {
    throw new AppError(403, 'BRANCH_SCOPE_VIOLATION', 'Record is outside the active branch scope.', {
      subjectType,
      requiredBranchId: tenant.branchId,
    });
  }
}
