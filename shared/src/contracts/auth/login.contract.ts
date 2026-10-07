import { z } from 'zod';
import {
  apiDataEnvelope,
  NonEmptyStringSchema,
  UuidSchema,
} from '../common';

export const LoginContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const LoginUserSchema = z.object({
  id: UuidSchema,
  name: NonEmptyStringSchema,
  memberships: z.array(z.unknown()),
});

/**
 * The specification prints the no-MFA response example and separately states
 * that login may return an MFA challenge. It does not print the MFA challenge
 * payload. The first union member is source-example-backed; the second is an
 * explicitly implementation-derived challenge representation.
 */
export const LoginDataSchema = z.union([
  z.object({
    accessToken: NonEmptyStringSchema,
    requiresMfa: z.literal(false),
    user: LoginUserSchema,
  }),
  z.object({
    requiresMfa: z.literal(true),
    mfaChallengeToken: NonEmptyStringSchema,
    user: LoginUserSchema,
  }),
]);

export const LoginResponseSchema = apiDataEnvelope(LoginDataSchema);

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
