import { z } from 'zod';
import { PageQuerySchema, UuidSchema } from '../common';
import { ApprovalRequestStatusSchema } from '../../schemas/status-models';

export const ApprovalContractMaturity =
  'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_FUNCTIONAL_APPROVAL_SPEC_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const ApprovalApproverTypeSchema = z.enum(['USER', 'ROLE']);
export type ApprovalApproverType = z.infer<typeof ApprovalApproverTypeSchema>;

export const ApprovalActionSchema = z.enum(['APPROVE', 'REJECT', 'RETURN']);
export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;

export const ApprovalConditionOperatorSchema = z.enum([
  'EQ',
  'NE',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
]);

const JsonScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const ApprovalConditionRuleSchema = z.object({
  field: z.string().min(1).max(120),
  operator: ApprovalConditionOperatorSchema,
  value: z.union([JsonScalarSchema, z.array(JsonScalarSchema)]),
});

export const ApprovalConditionSchema = z.object({
  all: z.array(ApprovalConditionRuleSchema).optional(),
  any: z.array(ApprovalConditionRuleSchema).optional(),
}).refine(
  (value) => (value.all?.length ?? 0) + (value.any?.length ?? 0) > 0,
  'At least one approval condition rule is required.',
);

export const ApprovalStepDefinitionInputSchema = z.object({
  sequence: z.number().int().positive(),
  approverType: ApprovalApproverTypeSchema,
  approverRef: UuidSchema,
  minApprovals: z.number().int().positive().default(1),
});

export const CreateApprovalDefinitionSchema = z.object({
  subjectType: z.string().min(1).max(120),
  name: z.string().min(2).max(200),
  condition: ApprovalConditionSchema.nullable().optional(),
  active: z.boolean().default(true),
  steps: z.array(ApprovalStepDefinitionInputSchema).min(1),
}).superRefine((value, ctx) => {
  const sequences = value.steps.map((step) => step.sequence);
  if (new Set(sequences).size !== sequences.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Approval step sequences must be unique within a definition.',
      path: ['steps'],
    });
  }

  value.steps.forEach((step, index) => {
    if (step.approverType === 'USER' && step.minApprovals !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'USER approval steps must use minApprovals = 1.',
        path: ['steps', index, 'minApprovals'],
      });
    }
  });
});

export const ApprovalInboxQuerySchema = PageQuerySchema.extend({
  subjectType: z.string().min(1).max(120).optional(),
});

export const ApprovalDefinitionListQuerySchema = PageQuerySchema.extend({
  subjectType: z.string().min(1).max(120).optional(),
  active: z.coerce.boolean().optional(),
});

export const ApprovalDecisionSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const ApprovalRejectSchema = z.object({
  comment: z.string().min(1).max(2000),
});

export const ApprovalReturnSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const ApprovalRequestDataSchema = z.object({
  id: UuidSchema,
  subjectType: z.string(),
  subjectId: UuidSchema,
  definitionId: UuidSchema,
  status: ApprovalRequestStatusSchema,
  requestedById: UuidSchema,
  branchId: UuidSchema.nullable(),
});

export const ApprovalDefinitionDataSchema = z.object({
  id: UuidSchema,
  subjectType: z.string(),
  name: z.string(),
  active: z.boolean(),
});
