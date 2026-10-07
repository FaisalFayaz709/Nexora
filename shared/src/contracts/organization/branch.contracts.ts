import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  PageQuerySchema,
  UuidSchema,
} from '../common';

export const BranchContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const BranchListQuerySchema = PageQuerySchema;

export const CreateBranchSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  addressId: UuidSchema.nullable().optional(),
});

export const UpdateBranchSchema = CreateBranchSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one editable field is required',
);

export const BranchDataSchema = z.object({
  id: UuidSchema,
  code: z.string(),
  name: z.string(),
  addressId: UuidSchema.nullable(),
});

export const BranchResponseSchema = apiDataEnvelope(BranchDataSchema);
export const BranchListResponseSchema = apiListEnvelope(BranchDataSchema);
