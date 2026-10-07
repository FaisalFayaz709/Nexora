import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  UuidSchema,
} from '../common';

export const AuthSessionContractsMaturity = 'IMPLEMENTATION_DERIVED_FROM_LOCKED_ROUTE_SEMANTICS' as const;

export const MfaVerifyRequestSchema = z.object({
  challengeToken: NonEmptyStringSchema,
  code: z.string().min(6).max(128),
});

export const AuthenticatedSessionDataSchema = z.object({
  accessToken: NonEmptyStringSchema,
  requiresMfa: z.literal(false),
  user: z.object({
    id: UuidSchema,
    name: NonEmptyStringSchema,
    memberships: z.array(z.unknown()),
  }),
});

export const MfaVerifyResponseSchema = apiDataEnvelope(AuthenticatedSessionDataSchema);

export const RefreshResponseSchema = apiDataEnvelope(
  z.object({ accessToken: NonEmptyStringSchema }),
);

export const LogoutResponseSchema = apiDataEnvelope(
  z.object({ revoked: z.literal(true) }),
);

export const SessionViewSchema = z.object({
  id: UuidSchema,
  device: z.string().nullable(),
  ip: z.string().nullable(),
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  current: z.boolean(),
});

export const SessionsResponseSchema = apiListEnvelope(SessionViewSchema);

export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>;
