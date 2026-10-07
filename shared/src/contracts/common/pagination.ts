import { z } from 'zod';

/**
 * The specification locks page/pageSize for ERP grids and requires bounded
 * pagination. The endpoint-specific upper bound is intentionally not invented
 * here; each route must apply its reviewed server-side maximum.
 */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  sort: z.string().min(1).optional(),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;
