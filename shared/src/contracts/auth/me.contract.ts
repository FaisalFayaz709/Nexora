import { z } from 'zod';
import {
  apiDataEnvelope,
  NonEmptyStringSchema,
  UuidSchema,
} from '../common';

export const AuthMeContractMaturity = 'IMPLEMENTATION_DERIVED_FROM_LOCKED_ROUTE_SEMANTICS' as const;

export const MembershipViewSchema = z.object({
  id: UuidSchema,
  organizationId: UuidSchema,
  branchId: UuidSchema.nullable(),
  status: NonEmptyStringSchema,
});

export const AuthMeDataSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  memberships: z.array(MembershipViewSchema),
  activeMembership: MembershipViewSchema.nullable(),
  permissions: z.array(NonEmptyStringSchema),
});

export const AuthMeResponseSchema = apiDataEnvelope(AuthMeDataSchema);
