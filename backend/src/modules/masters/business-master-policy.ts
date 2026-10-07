import { BusinessMasterRoutes, type BusinessMasterSubject } from '@nexora/shared';
import { AppError } from '../../core/http/errors.js';

export const BusinessMasterImmutableFields: Record<BusinessMasterSubject, readonly string[]> = {
  EMPLOYEE: ['id', 'organizationId', 'employeeNo', 'createdAt'],
  CUSTOMER: ['id', 'organizationId', 'code', 'createdAt'],
  CUSTOMER_SITE: ['id', 'organizationId', 'customerId', 'code', 'createdAt'],
  VENDOR: ['id', 'organizationId', 'code', 'createdAt'],
  PRODUCT_CATEGORY: ['id', 'organizationId', 'createdAt'],
  UNIT_OF_MEASURE: ['id', 'organizationId', 'code', 'createdAt'],
  PRODUCT: ['id', 'organizationId', 'sku', 'createdAt'],
  WAREHOUSE: ['id', 'organizationId', 'branchId', 'code', 'createdAt'],
  WAREHOUSE_LOCATION: ['id', 'warehouseId', 'code', 'createdAt'],
  VENDOR_PRODUCT: ['vendorId', 'productId', 'createdAt'],
};

export function getBusinessMasterRoute(subject: BusinessMasterSubject) {
  return BusinessMasterRoutes.find((route) => route.subject === subject);
}

export function assertBusinessMasterEditableFields(
  subject: BusinessMasterSubject,
  input: Record<string, unknown>,
) {
  const immutable = new Set(BusinessMasterImmutableFields[subject] ?? []);
  const attempted = Object.keys(input).filter((key) => immutable.has(key));
  if (attempted.length > 0) {
    throw new AppError(
      400,
      'BUSINESS_MASTER_IMMUTABLE_FIELD',
      `${subject} update attempted immutable field(s): ${attempted.join(', ')}.`,
      { subject, fields: attempted },
    );
  }
}

export function buildBusinessMasterListPolicy(subject: BusinessMasterSubject) {
  const route = getBusinessMasterRoute(subject);
  if (!route) {
    throw new AppError(500, 'BUSINESS_MASTER_ROUTE_NOT_REGISTERED', `${subject} is not registered.`);
  }

  return {
    subject,
    ownerModule: route.ownerModule,
    branchScoped: route.branchScoped,
    importSubject: route.importSubject,
    allowlistedSortFields: ['createdAt', 'updatedAt', 'name', 'code', 'status'],
    maxPageSize: 100,
    requiredGuards: [
      'authenticateRequest',
      'resolveTenantRequest',
      route.viewPermission,
      route.ownerModule,
    ],
  };
}

export const BusinessMasterCompletionChecklist = [
  'shared_zod_contract',
  'controller_uses_contract_parse',
  'route_uses_identity_tenant_permission_module_guard',
  'service_enforces_tenant_and_branch_scope',
  'repository_owns_prisma_access_only',
  'create_update_mutations_are_audited',
  'list_queries_are_paginated_and_bounded',
  'unique_business_identifier_is_tenant_local',
  'frontend_list_and_create_update_entry_points_exist',
  'runtime_tests_cover_cross_tenant_and_branch_denial',
] as const;
