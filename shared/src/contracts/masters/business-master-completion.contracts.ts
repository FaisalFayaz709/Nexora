import { z } from 'zod';
import { BusinessMasterSubjectSchema } from './business-master-manifest';

export const BusinessMasterCompletionMaturity =
  'MISSING_PASS_M7_SOURCE_PREFLIGHT_LOCKED_BUSINESS_MASTER_COMPLETION' as const;

export const BusinessMasterCompletionCapabilitySchema = z.enum([
  'shared_contract',
  'locked_route',
  'controller_parse',
  'tenant_scoped_repository',
  'reference_integrity',
  'branch_scope',
  'immutable_business_key',
  'audit_on_mutation',
  'bounded_pagination',
  'import_template',
  'frontend_entrypoint',
  'runtime_cross_tenant_test_pending',
]);

export const BusinessMasterCompletionRowSchema = z.object({
  subject: BusinessMasterSubjectSchema,
  capabilities: z.array(BusinessMasterCompletionCapabilitySchema).min(1),
  ownerModule: z.string().min(1),
  apiSurface: z.string().min(1),
  frontendSurface: z.string().min(1),
  productionStatus: z.enum(['SOURCE_PREFLIGHT_COMPLETE', 'RUNTIME_CERTIFICATION_PENDING']),
});

export type BusinessMasterCompletionRow = z.infer<typeof BusinessMasterCompletionRowSchema>;

export const BusinessMasterCompletionRows: readonly BusinessMasterCompletionRow[] = [
  {
    subject: 'EMPLOYEE',
    ownerModule: 'hr',
    apiSurface: '/api/v1/employees',
    frontendSurface: 'frontend/src/modules/hr',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'branch_scope','immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
  {
    subject: 'CUSTOMER',
    ownerModule: 'customers',
    apiSurface: '/api/v1/customers',
    frontendSurface: 'frontend/src/modules/customers',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
  {
    subject: 'CUSTOMER_SITE',
    ownerModule: 'customers',
    apiSurface: '/api/v1/customer-sites',
    frontendSurface: 'frontend/src/modules/customers',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
  {
    subject: 'VENDOR',
    ownerModule: 'vendors',
    apiSurface: '/api/v1/vendors',
    frontendSurface: 'frontend/src/modules/vendors',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
  {
    subject: 'PRODUCT',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/products',
    frontendSurface: 'frontend/src/modules/inventory',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
  {
    subject: 'WAREHOUSE',
    ownerModule: 'inventory',
    apiSurface: '/api/v1/warehouses',
    frontendSurface: 'frontend/src/modules/inventory',
    productionStatus: 'RUNTIME_CERTIFICATION_PENDING',
    capabilities: [
      'shared_contract','locked_route','controller_parse','tenant_scoped_repository','reference_integrity',
      'branch_scope','immutable_business_key','audit_on_mutation','bounded_pagination','import_template',
      'frontend_entrypoint','runtime_cross_tenant_test_pending',
    ],
  },
];

export const BusinessMasterSourcePreflightStatusSchema = z.object({
  pass: z.literal('M7_BUSINESS_MASTER_DATA_COMPLETION'),
  rows: z.array(BusinessMasterCompletionRowSchema).min(6),
  runtimeCertification: z.literal('PENDING_LOCAL_RUNTIME'),
});
