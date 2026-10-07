import { z } from 'zod';

export const PASS_18_FRONTEND_COMPLETION = 'PASS_18_SOURCE_LEVEL_FRONTEND_COMPLETION_RUNTIME_PENDING' as const;

export const Pass18FrontendCompletionAreas = [
  'ROUTE_GROUP_SHELLS',
  'SHADCN_PRIMITIVES_AND_NEXORA_WRAPPERS',
  'REACT_HOOK_FORM_ZOD_FORMS',
  'TANSTACK_TABLE_GRIDS',
  'TANSTACK_QUERY_SERVER_STATE',
  'CENTRALIZED_API_CLIENT',
  'SCREEN_BY_SCREEN_CONTRACTS',
  'COMMAND_DIALOGS_AND_STATE_TRANSITIONS',
  'PERMISSION_FORBIDDEN_NOT_FOUND_CONFLICT_STATES',
  'RESPONSIVE_PORTAL_AND_TECHNICIAN_SURFACES',
  'NO_NEXTJS_BUSINESS_API_DUPLICATION',
  'NO_FRONTEND_BACKEND_DATABASE_IMPORTS',
] as const;

export const Pass18ComplexFieldArrays = [
  'purchase-request-items',
  'supplier-quotation-items',
  'purchase-order-items',
  'goods-receipt-items',
  'customer-invoice-items',
  'supplier-invoice-items',
  'payment-allocations',
  'expense-items',
  'stock-transfer-items',
  'stock-adjustment-items',
  'journal-lines',
  'tax-lines',
  'project-bom-items',
  'project-budget-lines',
  'service-report-parts',
  'maintenance-execution-parts',
  'technician-offline-sync-commands',
  'integration-webhook-create-form',
] as const;

export const Pass18FrontendNoViolationRules = [
  'Business APIs remain in Fastify /api/v1; frontend route handlers cannot own ERP domain logic.',
  'All frontend API calls go through the centralized api-client and module api.ts helpers.',
  'All ERP grids use TanStack Table through the NEXORA DataTable abstraction.',
  'All create, edit and command forms use React Hook Form with shared or module-owned Zod schemas.',
  'All authenticated pages inherit AppShell, PortalShell or TechnicianPwaShell from route-group layouts.',
  'Frontend cannot import backend, database, worker, Prisma, MinIO, Redis or BullMQ packages.',
  'Status changes are command endpoints/dialogs, not generic free status PATCH fields.',
  'Financial, inventory and retry-sensitive commands use idempotency where required by backend contracts.',
] as const;

export const Pass18FrontendCompletionSchema = z.object({
  status: z.literal(PASS_18_FRONTEND_COMPLETION),
  areas: z.array(z.enum(Pass18FrontendCompletionAreas)),
  complexFieldArrays: z.array(z.enum(Pass18ComplexFieldArrays)),
  noViolationRules: z.array(z.string().min(1)),
  runtimeStillPending: z.literal(true),
});

export type Pass18FrontendCompletion = z.infer<typeof Pass18FrontendCompletionSchema>;

export const Pass18FrontendCompletionManifest = Object.freeze({
  status: PASS_18_FRONTEND_COMPLETION,
  areas: Pass18FrontendCompletionAreas,
  complexFieldArrays: Pass18ComplexFieldArrays,
  noViolationRules: Pass18FrontendNoViolationRules,
  runtimeStillPending: true,
});
