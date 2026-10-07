import { z } from 'zod';

/**
 * Pass C2 shared registry for master-data surfaces that every downstream module
 * is allowed to depend on through public APIs/facades only.
 *
 * This package is browser-safe by design: no Prisma types, server secrets,
 * hashing, signing or storage clients are imported here.
 */
export const BusinessMasterSubjectSchema = z.enum([
  'EMPLOYEE',
  'CUSTOMER',
  'CUSTOMER_SITE',
  'VENDOR',
  'PRODUCT_CATEGORY',
  'UNIT_OF_MEASURE',
  'PRODUCT',
  'WAREHOUSE',
  'WAREHOUSE_LOCATION',
  'VENDOR_PRODUCT',
]);

export type BusinessMasterSubject = z.infer<typeof BusinessMasterSubjectSchema>;

export const BusinessMasterRouteSchema = z.object({
  subject: BusinessMasterSubjectSchema,
  ownerModule: z.string().min(1),
  listPath: z.string().startsWith('/api/v1/'),
  createPermission: z.string().min(1),
  viewPermission: z.string().min(1),
  updatePermission: z.string().min(1),
  branchScoped: z.boolean(),
  importSubject: z.boolean(),
});

export type BusinessMasterRoute = z.infer<typeof BusinessMasterRouteSchema>;

export const BusinessMasterRoutes = [
  {
    subject: 'EMPLOYEE',
    ownerModule: 'hr',
    listPath: '/api/v1/employees',
    createPermission: 'employee.create',
    viewPermission: 'employee.view',
    updatePermission: 'employee.update',
    branchScoped: true,
    importSubject: true,
  },
  {
    subject: 'CUSTOMER',
    ownerModule: 'customers',
    listPath: '/api/v1/customers',
    createPermission: 'customer.create',
    viewPermission: 'customer.view',
    updatePermission: 'customer.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'CUSTOMER_SITE',
    ownerModule: 'customers',
    listPath: '/api/v1/customer-sites',
    createPermission: 'customer_site.create',
    viewPermission: 'customer_site.view',
    updatePermission: 'customer_site.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'VENDOR',
    ownerModule: 'vendors',
    listPath: '/api/v1/vendors',
    createPermission: 'vendor.create',
    viewPermission: 'vendor.view',
    updatePermission: 'vendor.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'PRODUCT_CATEGORY',
    ownerModule: 'inventory',
    listPath: '/api/v1/product-categories',
    createPermission: 'product.create',
    viewPermission: 'product.view',
    updatePermission: 'product.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'UNIT_OF_MEASURE',
    ownerModule: 'inventory',
    listPath: '/api/v1/units-of-measure',
    createPermission: 'product.create',
    viewPermission: 'product.view',
    updatePermission: 'product.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'PRODUCT',
    ownerModule: 'inventory',
    listPath: '/api/v1/products',
    createPermission: 'product.create',
    viewPermission: 'product.view',
    updatePermission: 'product.update',
    branchScoped: false,
    importSubject: true,
  },
  {
    subject: 'WAREHOUSE',
    ownerModule: 'inventory',
    listPath: '/api/v1/warehouses',
    createPermission: 'warehouse.create',
    viewPermission: 'warehouse.view',
    updatePermission: 'warehouse.update',
    branchScoped: true,
    importSubject: true,
  },
  {
    subject: 'WAREHOUSE_LOCATION',
    ownerModule: 'inventory',
    listPath: '/api/v1/warehouse-locations',
    createPermission: 'warehouse.update',
    viewPermission: 'warehouse.view',
    updatePermission: 'warehouse.update',
    branchScoped: true,
    importSubject: true,
  },
  {
    subject: 'VENDOR_PRODUCT',
    ownerModule: 'vendors',
    listPath: '/api/v1/vendor-products',
    createPermission: 'vendor.create',
    viewPermission: 'vendor.view',
    updatePermission: 'vendor.update',
    branchScoped: false,
    importSubject: true,
  },
] as const satisfies readonly BusinessMasterRoute[];

export const BusinessMasterImportSubjectSchema = BusinessMasterSubjectSchema;

export const BusinessMasterStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING_ONBOARDING',
  'BLACKLISTED',
]);

export const BusinessMasterAuditActionSchema = z.enum([
  'EMPLOYEE_CREATED',
  'EMPLOYEE_UPDATED',
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'CUSTOMER_SITE_CREATED',
  'CUSTOMER_SITE_UPDATED',
  'VENDOR_CREATED',
  'VENDOR_UPDATED',
  'VENDOR_PRODUCT_LINKED',
  'PRODUCT_CATEGORY_CREATED',
  'PRODUCT_CATEGORY_UPDATED',
  'UNIT_OF_MEASURE_CREATED',
  'UNIT_OF_MEASURE_UPDATED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'WAREHOUSE_CREATED',
  'WAREHOUSE_UPDATED',
  'WAREHOUSE_LOCATION_CREATED',
  'WAREHOUSE_LOCATION_UPDATED',
]);

export type BusinessMasterAuditAction = z.infer<typeof BusinessMasterAuditActionSchema>;
