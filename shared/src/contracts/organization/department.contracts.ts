import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  PageQuerySchema,
  UuidSchema,
} from '../common';

export const DepartmentContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const DepartmentListQuerySchema = PageQuerySchema.extend({
  branchId: UuidSchema.optional(),
});

export const CreateDepartmentSchema = z.object({
  branchId: UuidSchema,
  name: z.string().min(1).max(200),
});

export const UpdateDepartmentSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    })
  .refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');

export const DepartmentDataSchema = z.object({
  id: UuidSchema,
  branchId: UuidSchema,
  name: z.string(),
  managerEmployeeId: UuidSchema.nullable(),
});

export const DepartmentResponseSchema = apiDataEnvelope(DepartmentDataSchema);
export const DepartmentListResponseSchema = apiListEnvelope(DepartmentDataSchema);
