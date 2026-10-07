export interface TenantRequestContext {
  readonly membershipId: string;
  readonly organizationId: string;
  readonly branchId: string | null;
}
