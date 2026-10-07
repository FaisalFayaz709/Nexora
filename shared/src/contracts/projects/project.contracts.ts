import { z } from 'zod';
import {
  DecimalStringSchema,
  IsoDateSchema,
  NonEmptyStringSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { ProjectStatusSchema } from '../../schemas/status-models';

export const ProjectContractMaturity =
  'CREATE_PROJECT_SOURCE_EXAMPLE_PLUS_IMPLEMENTATION_DERIVED_LOCKED_ROUTE_CONTRACTS' as const;

export const ProjectTaskStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
]);

export const ProjectPhaseStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const ProjectBomStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'SUPERSEDED',
]);

export const ProjectBudgetStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'SUPERSEDED',
]);

export const ProjectMilestoneStatusSchema = z.enum([
  'PENDING',
  'ACHIEVED',
  'CANCELLED',
]);

export const ProjectRiskStatusSchema = z.enum([
  'OPEN',
  'MITIGATED',
  'CLOSED',
]);

export const ProjectIssueStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export const ProjectHandoverStatusSchema = z.enum([
  'COMPLETED',
]);

export const ProjectListQuerySchema = PageQuerySchema.extend({
  status: ProjectStatusSchema.optional(),
  customerId: UuidSchema.optional(),
  managerId: UuidSchema.optional(),
});

export const UpdateProjectSchema = z.object({
  name: NonEmptyStringSchema.optional(),
  managerId: UuidSchema.optional(),
  startDate: IsoDateSchema.optional(),
  dueDate: IsoDateSchema.optional(),
  contractValue: DecimalStringSchema.optional(),
  status: ProjectStatusSchema.optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one editable field is required.',
);

export const ProjectTaskListQuerySchema = PageQuerySchema.extend({
  projectId: UuidSchema.optional(),
  assigneeId: UuidSchema.optional(),
  status: ProjectTaskStatusSchema.optional(),
});

export const CreateProjectTaskSchema = z.object({
  projectId: UuidSchema,
  phaseId: UuidSchema.nullable().optional(),
  assigneeId: UuidSchema.nullable().optional(),
  title: NonEmptyStringSchema,
  status: ProjectTaskStatusSchema.default('NOT_STARTED'),
  priority: z.string().min(1).max(50).default('NORMAL'),
  startDate: IsoDateSchema.nullable().optional(),
  dueDate: IsoDateSchema.nullable().optional(),
  completionPct: z.number().int().min(0).max(100).default(0),
  dependencyTaskIds: z.array(UuidSchema).default([]),
});

export const UpdateProjectTaskSchema = z.object({
  phaseId: UuidSchema.nullable().optional(),
  assigneeId: UuidSchema.nullable().optional(),
  title: NonEmptyStringSchema.optional(),
  status: ProjectTaskStatusSchema.optional(),
  priority: z.string().min(1).max(50).optional(),
  startDate: IsoDateSchema.nullable().optional(),
  dueDate: IsoDateSchema.nullable().optional(),
  completionPct: z.number().int().min(0).max(100).optional(),
  dependencyTaskIds: z.array(UuidSchema).optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one editable task field is required.',
);

export const BomItemInputSchema = z.object({
  productId: UuidSchema,
  requiredQty: DecimalStringSchema,
});

export const UpsertProjectBomSchema = z.object({
  items: z.array(BomItemInputSchema).min(1),
});

export const CreateMaterialRequirementSchema = z.object({
  requestedById: UuidSchema.optional(),
});

export const CompleteProjectHandoverSchema = z.object({
  acceptedByCustomerId: UuidSchema,
  acceptedAt: z.string().datetime().optional(),
  documentId: UuidSchema.nullable().optional(),
});

export const ProjectTimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(250).default(100),
});
