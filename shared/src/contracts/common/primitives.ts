import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const NonEmptyStringSchema = z.string().min(1);

/**
 * API examples carry monetary/quantity values as decimal strings.
 * Precision and scale are enforced by the owning business service/database
 * because the specification allows 18,2 and 18,4 depending on context.
 */
export const DecimalStringSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/);

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
