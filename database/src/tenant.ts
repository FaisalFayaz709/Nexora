export interface TenantContext {
  readonly organizationId: string;
  readonly branchId?: string | null;
}

export function tenantWhere(context: TenantContext) {
  return { organizationId: context.organizationId } as const;
}

export function tenantBranchWhere(context: TenantContext) {
  return {
    organizationId: context.organizationId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  } as const;
}
