import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { PermissionKeySchema } from '../../permissions';

export const IdentityAdministrationContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_RBAC_AND_IAM_BLUEPRINT' as const;

export const TenantUserListQuerySchema = PageQuerySchema.extend({
  branchId: UuidSchema.optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'SUSPENDED', 'PASSWORD_EXPIRED', 'DISABLED']).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const CreateTenantUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  branchId: UuidSchema.nullable().optional(),
  roleIds: z.array(UuidSchema).default([]),
});

export const UpdateTenantUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'LOCKED', 'SUSPENDED', 'PASSWORD_EXPIRED', 'DISABLED']),
});

export const CreateRoleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  mfaRequired: z.boolean().default(false),
  permissionKeys: z.array(PermissionKeySchema).default([]),
});

export const UpdateRoleSchema = z.object({
  mfaRequired: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one role field must be provided.',
});

export const ReplaceRolePermissionsSchema = z.object({
  permissionKeys: z.array(PermissionKeySchema),
});

export const AssignRoleSchema = z.object({
  membershipId: UuidSchema,
  roleId: UuidSchema,
});

export const RoleViewSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  systemRole: z.boolean(),
  mfaRequired: z.boolean(),
  permissionKeys: z.array(PermissionKeySchema),
});

export const TenantUserViewSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  status: z.string(),
  membershipId: UuidSchema,
  branchId: UuidSchema.nullable(),
  membershipStatus: z.string(),
  lastLoginAt: z.string().nullable().optional(),
  roles: z.array(RoleViewSchema.pick({ id: true, name: true, mfaRequired: true })),
});

export const TenantUserResponseSchema = apiDataEnvelope(TenantUserViewSchema);
export const TenantUserListResponseSchema = apiListEnvelope(TenantUserViewSchema);
export const RoleResponseSchema = apiDataEnvelope(RoleViewSchema);
export const RoleListResponseSchema = apiListEnvelope(RoleViewSchema);

export type CreateTenantUserInput = z.infer<typeof CreateTenantUserSchema>;
export type UpdateTenantUserStatusInput = z.infer<typeof UpdateTenantUserStatusSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
