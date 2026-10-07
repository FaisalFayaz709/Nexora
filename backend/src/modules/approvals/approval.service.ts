import { withTransaction, type TransactionClient } from '@nexora/database';
import {
  ApprovalConditionSchema,
  WorkflowRuleConditionSchema,
  type ApprovalAction,
  type CreateWorkflowRuleInput,
  type UpdateWorkflowRuleInput,
  type EvaluateWorkflowRulesInput,
  type WorkflowRuleAction,
} from '@nexora/shared';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ApprovalRepository } from './approval.repository.js';
import {
  assertApprovalDecisionAllowed,
  assertApprovalDefinitionConfiguration,
  assertApprovalSubjectType,
  assertMakerCheckerPolicy,
} from './approval-engine-policy.js';
import {
  assertFraudControlResult,
  assertPass16WorkflowSubject,
  assertWorkflowRuleDefinition,
  decideWorkflowControl,
} from './approval-workflow-control-policy.js';
import { ApprovalSubjectRegistry } from './approval-subject.registry.js';

const PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function paging(query: { page?: number; pageSize?: number }) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? PAGE_SIZE, MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function valueAtPath(context: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[part];
  }, context);
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function matchesRule(actual: unknown, operator: string, expected: unknown): boolean {
  if (operator === 'EQ') return actual === expected;
  if (operator === 'NE') return actual !== expected;

  if (operator === 'IN') {
    return Array.isArray(expected) && expected.some((item) => item === actual);
  }

  const left = numeric(actual);
  const right = numeric(expected);
  if (left === null || right === null) return false;

  if (operator === 'GT') return left > right;
  if (operator === 'GTE') return left >= right;
  if (operator === 'LT') return left < right;
  if (operator === 'LTE') return left <= right;
  return false;
}

function matchesCondition(condition: unknown, context: Record<string, unknown>): boolean {
  if (condition === null || condition === undefined) return true;
  const parsed = ApprovalConditionSchema.safeParse(condition);
  if (!parsed.success) return false;

  const all = parsed.data.all ?? [];
  const any = parsed.data.any ?? [];

  const allMatches = all.every((rule) =>
    matchesRule(valueAtPath(context, rule.field), rule.operator, rule.value),
  );
  const anyMatches = any.length === 0 || any.some((rule) =>
    matchesRule(valueAtPath(context, rule.field), rule.operator, rule.value),
  );

  return allMatches && anyMatches;
}

function matchesWorkflowRule(condition: unknown, context: Record<string, unknown>): boolean {
  const parsed = WorkflowRuleConditionSchema.safeParse(condition);
  if (!parsed.success) return false;

  const evaluate = (rule: { field: string; operator: string; value?: unknown }) => {
    const actual = valueAtPath(context, rule.field);
    if (rule.operator === 'EXISTS') return actual !== undefined && actual !== null;
    if (rule.operator === 'NOT_EXISTS') return actual === undefined || actual === null;
    return matchesRule(actual, rule.operator, rule.value);
  };

  const all = parsed.data.all ?? [];
  const any = parsed.data.any ?? [];
  const allMatches = all.every(evaluate);
  const anyMatches = any.length === 0 || any.some(evaluate);
  return allMatches && anyMatches;
}

function normalizeWorkflowRuleUpdate(input: UpdateWorkflowRuleInput) {
  const patch: Record<string, unknown> = {};
  if (input.triggerType !== undefined) patch.triggerType = input.triggerType;
  if (input.subjectType !== undefined) patch.subjectType = input.subjectType;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.severity !== undefined) patch.severity = input.severity;
  if (input.condition !== undefined) patch.conditionJson = input.condition;
  if (input.actions !== undefined) patch.actionsJson = input.actions;
  if (input.active !== undefined) patch.active = input.active;
  return patch;
}

export class ApprovalService {
  constructor(
    private readonly identity: IdentityFacade,
    private readonly access: PlatformAccessFacade,
    private readonly subjects: ApprovalSubjectRegistry,
    private readonly repository = new ApprovalRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async listDefinitions(
    tenant: TenantRequestContext,
    query: { page?: number; pageSize?: number; subjectType?: string; active?: boolean },
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const page = paging(query);
    const [rows, total] = await this.repository.listDefinitions({
      organizationId: tenant.organizationId,
      subjectType: query.subjectType,
      active: query.active,
      skip: page.skip,
      take: page.take,
    });
    return { ...page, rows, total };
  }

  async createDefinition(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: {
      subjectType: string;
      name: string;
      condition?: unknown | null;
      active: boolean;
      steps: Array<{
        sequence: number;
        approverType: 'USER' | 'ROLE';
        approverRef: string;
        minApprovals: number;
      }>;
    },
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    assertApprovalDefinitionConfiguration({
      subjectType: input.subjectType,
      condition: input.condition ?? null,
      steps: input.steps,
    });

    for (const step of input.steps) {
      if (step.approverType === 'USER') {
        if (!(await this.identity.userHasActiveMembership(step.approverRef, tenant.organizationId))) {
          throw new AppError(
            400,
            'APPROVAL_APPROVER_USER_INVALID',
            'Approval user approver must have an active membership in the organization.',
            { approverRef: step.approverRef },
          );
        }
      } else if (!(await this.identity.roleBelongsToOrganization(step.approverRef, tenant.organizationId))) {
        throw new AppError(
          400,
          'APPROVAL_APPROVER_ROLE_INVALID',
          'Approval role approver must belong to the organization.',
          { approverRef: step.approverRef },
        );
      }
    }

    return withTransaction(async (tx) => {
      const row = await this.repository.createDefinition(tx, {
        organizationId: tenant.organizationId,
        subjectType: input.subjectType,
        name: input.name,
        conditionJson: input.condition ?? null,
        active: input.active,
        steps: [...input.steps].sort((a, b) => a.sequence - b.sequence),
      });

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'APPROVAL_DEFINITION_CREATED',
        subjectType: 'ApprovalDefinition',
        subjectId: row.id,
        afterJson: {
          subjectType: row.subjectType,
          name: row.name,
          active: row.active,
          stepCount: row.steps.length,
        },
        ip: actor.ip,
      });

      return row;
    });
  }

  async requestApproval(
    tx: TransactionClient,
    input: {
      organizationId: string;
      branchId: string | null;
      subjectType: string;
      subjectId: string;
      requestedById: string;
      context: Record<string, unknown>;
    },
  ) {
    await this.access.assertModuleEnabled(input.organizationId, 'approvals');
    assertApprovalSubjectType(input.subjectType);

    const definitions = await this.repository.withDb(tx).activeDefinitions(
      input.organizationId,
      input.subjectType,
    );

    const matched = definitions.filter((definition) =>
      matchesCondition(definition.conditionJson, input.context),
    );

    if (matched.length === 0) {
      throw new AppError(
        409,
        'APPROVAL_DEFINITION_NOT_CONFIGURED_OR_MATCHED',
        'No active approval definition matches this subject and context.',
        { subjectType: input.subjectType },
      );
    }
    if (matched.length > 1) {
      throw new AppError(
        409,
        'APPROVAL_DEFINITION_AMBIGUOUS',
        'More than one active approval definition matches this subject and context.',
        {
          subjectType: input.subjectType,
          definitionIds: matched.map((definition) => definition.id),
        },
      );
    }

    const definition = matched[0]!;
    if (definition.steps.length === 0) {
      throw new AppError(
        409,
        'APPROVAL_DEFINITION_HAS_NO_STEPS',
        'Approval definition has no configured approval steps.',
      );
    }

    const firstSequence = definition.steps[0]!.sequence;
    const now = new Date();
    const request = await this.repository.createRequest(tx, {
      organizationId: input.organizationId,
      branchId: input.branchId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      definitionId: definition.id,
      requestedById: input.requestedById,
      contextJson: input.context,
      steps: definition.steps.map((step) => ({
        sequence: step.sequence,
        approverType: step.approverType,
        approverRef: step.approverRef,
        minApprovals: step.minApprovals,
        status: step.sequence === firstSequence ? 'PENDING' : 'WAITING',
        activatedAt: step.sequence === firstSequence ? now : null,
      })),
    });

    await this.auditWriter.append(tx, {
      organizationId: input.organizationId,
      actorUserId: input.requestedById,
      action: 'APPROVAL_REQUEST_CREATED',
      subjectType: 'ApprovalRequest',
      subjectId: request.id,
      afterJson: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        definitionId: definition.id,
        status: request.status,
      },
      ip: null,
    });

    return request;
  }


  async requestApprovalIfConfigured(
    tx: TransactionClient,
    input: {
      organizationId: string;
      branchId: string | null;
      subjectType: string;
      subjectId: string;
      requestedById: string;
      context: Record<string, unknown>;
    },
  ) {
    await this.access.assertModuleEnabled(input.organizationId, 'approvals');
    assertApprovalSubjectType(input.subjectType);

    const definitions = await this.repository.withDb(tx).activeDefinitions(
      input.organizationId,
      input.subjectType,
    );
    const matched = definitions.filter((definition) =>
      matchesCondition(definition.conditionJson, input.context),
    );

    if (matched.length === 0) return null;
    if (matched.length > 1) {
      throw new AppError(
        409,
        'APPROVAL_DEFINITION_AMBIGUOUS',
        'More than one active approval definition matches this subject and context.',
        {
          subjectType: input.subjectType,
          definitionIds: matched.map((definition) => definition.id),
        },
      );
    }

    return this.requestApproval(tx, input);
  }

  async inbox(
    tenant: TenantRequestContext,
    actorUserId: string,
    query: { page?: number; pageSize?: number; subjectType?: string },
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const roleIds = await this.identity.roleIds(actorUserId, tenant);
    const page = paging(query);
    const [rows, total] = await this.repository.listInbox({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      actorUserId,
      roleIds,
      subjectType: query.subjectType,
      skip: page.skip,
      take: page.take,
    });

    return {
      ...page,
      total,
      rows: rows.map((step) => ({
        id: step.approvalRequest.id,
        subjectType: step.approvalRequest.subjectType,
        subjectId: step.approvalRequest.subjectId,
        definitionId: step.approvalRequest.definitionId,
        definitionName: step.approvalRequest.definition.name,
        status: step.approvalRequest.status,
        requestedById: step.approvalRequest.requestedById,
        branchId: step.approvalRequest.branchId,
        currentStep: {
          id: step.id,
          sequence: step.sequence,
          approverType: step.approverType,
          approverRef: step.approverRef,
          minApprovals: step.minApprovals,
          approvalsRecorded: step.actions.filter((action) => action.action === 'APPROVE').length,
        },
      })),
    };
  }

  async detail(tenant: TenantRequestContext, id: string) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const row = await this.repository.getRequest(
      tenant.organizationId,
      tenant.branchId,
      id,
    );
    if (!row) {
      throw new AppError(404, 'APPROVAL_REQUEST_NOT_FOUND', 'Approval request not found.');
    }
    return row;
  }

  async actBySubject(
    tenant: TenantRequestContext,
    actorUserId: string,
    subjectType: string,
    subjectId: string,
    action: ApprovalAction,
    comment: string | null,
  ) {
    const current = await this.repository.currentRequestBySubject(
      tenant.organizationId,
      subjectType,
      subjectId,
    );
    if (!current) {
      throw new AppError(
        409,
        'APPROVAL_REQUEST_NOT_ACTIVE',
        'No active approval request exists for the subject.',
        { subjectType, subjectId },
      );
    }
    return this.act(tenant, actorUserId, current.id, action, comment);
  }

  async act(
    tenant: TenantRequestContext,
    actorUserId: string,
    requestId: string,
    action: ApprovalAction,
    comment: string | null,
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const roleIds = await this.identity.roleIds(actorUserId, tenant);

    return withTransaction(async (tx) => {
      const request = await this.repository.lockRequest(
        tx,
        tenant.organizationId,
        requestId,
      );
      if (!request) {
        throw new AppError(404, 'APPROVAL_REQUEST_NOT_FOUND', 'Approval request not found.');
      }
      assertApprovalDecisionAllowed({
        currentStatus: request.status,
        action,
        comment,
      });
      if (tenant.branchId && request.branchId && tenant.branchId !== request.branchId) {
        throw new AppError(
          403,
          'APPROVAL_BRANCH_SCOPE_DENIED',
          'Approval request is outside the active branch scope.',
        );
      }
      assertMakerCheckerPolicy({
        requestedById: request.requestedById,
        actorUserId,
        action,
        subjectType: request.subjectType,
      });

      const step = await this.repository.lockPendingStep(tx, request.id);
      if (!step) {
        throw new AppError(
          409,
          'APPROVAL_STEP_NOT_AVAILABLE',
          'No current approval step is available for action.',
        );
      }

      const eligible =
        (step.approverType === 'USER' && step.approverRef === actorUserId) ||
        (step.approverType === 'ROLE' && roleIds.includes(step.approverRef));
      if (!eligible) {
        throw new AppError(
          403,
          'APPROVAL_ACTOR_NOT_ELIGIBLE',
          'The current user is not an eligible approver for this step.',
        );
      }

      if ((await this.repository.actorAlreadyActed(tx, step.id, actorUserId)) > 0) {
        throw new AppError(
          409,
          'APPROVAL_ACTOR_ALREADY_ACTED',
          'The current user has already acted on this approval step.',
        );
      }

      await this.repository.createAction(tx, {
        approvalStepId: step.id,
        actorId: actorUserId,
        action,
        comment,
      });

      let requestStatus = request.status;

      if (action === 'APPROVE') {
        const approvals = await this.repository.approvalCount(tx, step.id);
        if (approvals >= step.minApprovals) {
          await this.repository.setStepStatus(tx, step.id, 'APPROVED', new Date());
          const next = await this.repository.nextWaitingStep(
            tx,
            request.id,
            step.sequence,
          );
          if (next) {
            await this.repository.activateStep(tx, next.id);
            await this.repository.setRequestStatus(tx, request.id, 'IN_PROGRESS', false);
            requestStatus = 'IN_PROGRESS';
          } else {
            await this.repository.setRequestStatus(tx, request.id, 'APPROVED', true);
            requestStatus = 'APPROVED';
            await this.subjects.applyDecision(tx, {
              organizationId: tenant.organizationId,
              subjectType: request.subjectType,
              subjectId: request.subjectId,
              decision: 'APPROVED',
              actorUserId,
              comment,
              approvalRequestId: request.id,
            });
          }
        } else {
          requestStatus = 'IN_PROGRESS';
        }
      } else {
        const stepStatus = action === 'REJECT' ? 'REJECTED' : 'RETURNED';
        const finalStatus = action === 'REJECT' ? 'REJECTED' : 'RETURNED';
        await this.repository.setStepStatus(tx, step.id, stepStatus, new Date());
        await this.repository.setRequestStatus(tx, request.id, finalStatus, true);
        requestStatus = finalStatus;

        await this.subjects.applyDecision(tx, {
          organizationId: tenant.organizationId,
          subjectType: request.subjectType,
          subjectId: request.subjectId,
          decision: finalStatus,
          actorUserId,
          comment,
          approvalRequestId: request.id,
        });
      }

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId,
        action: `APPROVAL_${action}`,
        subjectType: 'ApprovalRequest',
        subjectId: request.id,
        beforeJson: { status: request.status, stepSequence: step.sequence },
        afterJson: {
          status: requestStatus,
          stepSequence: step.sequence,
          action,
          comment,
        },
        ip: null,
      });

      return this.repository.withDb(tx).getRequest(
        tenant.organizationId,
        tenant.branchId,
        request.id,
      );
    });
  }

  async listWorkflowRules(
    tenant: TenantRequestContext,
    query: { page?: number; pageSize?: number; triggerType?: string; subjectType?: string; active?: boolean },
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const page = paging(query);
    const [rows, total] = await this.repository.listWorkflowRules({
      organizationId: tenant.organizationId,
      triggerType: query.triggerType,
      subjectType: query.subjectType,
      active: query.active,
      skip: page.skip,
      take: page.take,
    });
    return { ...page, rows, total };
  }

  async workflowRuleDetail(tenant: TenantRequestContext, id: string) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const row = await this.repository.getWorkflowRule(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'WORKFLOW_RULE_NOT_FOUND', 'Workflow rule not found.');
    return row;
  }

  async createWorkflowRule(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: CreateWorkflowRuleInput,
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    assertWorkflowRuleDefinition({
      triggerType: input.triggerType,
      subjectType: input.subjectType,
      condition: input.condition,
      actions: input.actions,
    });

    return withTransaction(async (tx) => {
      const row = await this.repository.createWorkflowRule(tx, {
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
        triggerType: input.triggerType,
        subjectType: input.subjectType,
        name: input.name,
        description: input.description ?? null,
        severity: input.severity,
        conditionJson: input.condition,
        actionsJson: input.actions,
        active: input.active,
        createdById: actor.userId,
      });
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'WORKFLOW_RULE_CREATED',
        subjectType: 'BusinessRule',
        subjectId: row.id,
        afterJson: { triggerType: row.triggerType, subjectType: row.subjectType, active: row.active },
        ip: actor.ip,
      });
      return row;
    });
  }

  async updateWorkflowRule(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: UpdateWorkflowRuleInput,
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const existing = await this.repository.getWorkflowRule(tenant.organizationId, id);
    if (!existing) throw new AppError(404, 'WORKFLOW_RULE_NOT_FOUND', 'Workflow rule not found.');
    const next = {
      triggerType: input.triggerType ?? existing.triggerType,
      subjectType: input.subjectType ?? existing.subjectType,
      condition: input.condition ?? existing.conditionJson,
      actions: input.actions ?? (existing.actionsJson as WorkflowRuleAction[]),
    };
    assertWorkflowRuleDefinition(next);

    return withTransaction(async (tx) => {
      const row = await this.repository.updateWorkflowRule(tx, tenant.organizationId, id, normalizeWorkflowRuleUpdate(input));
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'WORKFLOW_RULE_UPDATED',
        subjectType: 'BusinessRule',
        subjectId: row.id,
        beforeJson: { triggerType: existing.triggerType, subjectType: existing.subjectType, active: existing.active },
        afterJson: { triggerType: row.triggerType, subjectType: row.subjectType, active: row.active },
        ip: actor.ip,
      });
      return row;
    });
  }

  async setWorkflowRuleActive(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    active: boolean,
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    const existing = await this.repository.getWorkflowRule(tenant.organizationId, id);
    if (!existing) throw new AppError(404, 'WORKFLOW_RULE_NOT_FOUND', 'Workflow rule not found.');
    return withTransaction(async (tx) => {
      const row = await this.repository.setWorkflowRuleActive(tx, tenant.organizationId, id, active);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: active ? 'WORKFLOW_RULE_ACTIVATED' : 'WORKFLOW_RULE_DEACTIVATED',
        subjectType: 'BusinessRule',
        subjectId: row.id,
        beforeJson: { active: existing.active },
        afterJson: { active: row.active },
        ip: actor.ip,
      });
      return row;
    });
  }

  async evaluateWorkflowRules(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: EvaluateWorkflowRulesInput,
  ) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'approvals');
    assertPass16WorkflowSubject(input.subjectType);
    const rules = await this.repository.activeWorkflowRules(
      tenant.organizationId,
      input.triggerType,
      input.subjectType,
    );
    const matched = rules.filter((rule: { conditionJson: unknown }) => matchesWorkflowRule(rule.conditionJson, input.context));
    const actions = matched.flatMap((rule: { actionsJson: unknown }) => Array.isArray(rule.actionsJson) ? rule.actionsJson as WorkflowRuleAction[] : []);
    const decision = decideWorkflowControl(actions);

    for (const rule of matched as Array<{ name: string; actionsJson: unknown }>) {
      if (rule.name.includes('Invoice amount greater than PO amount')) {
        assertFraudControlResult({ controlId: 'invoice_amount_greater_than_po_amount_blocks_supplier_invoice_approval', decision, subjectType: input.subjectType });
      }
      if (rule.name.includes('Same user creates vendor and payment')) {
        assertFraudControlResult({ controlId: 'same_user_creates_vendor_and_payment_requires_secondary_approval', decision, subjectType: input.subjectType });
      }
      if (rule.name.includes('Stock adjustment threshold')) {
        assertFraudControlResult({ controlId: 'stock_adjustment_above_threshold_requires_warehouse_manager_approval', decision, subjectType: input.subjectType });
      }
    }

    const result = {
      triggerType: input.triggerType,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      decision,
      matchedRules: matched.map((rule: { id: string; name: string; severity: string; actionsJson: unknown }) => ({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        actions: rule.actionsJson,
      })),
      messages: actions.map((action) => action.message).filter(Boolean),
      auditAction: decision === 'BLOCK' ? 'FRAUD_CONTROL_BLOCKED' : decision === 'REQUIRE_SECONDARY_APPROVAL' ? 'FRAUD_CONTROL_REQUIRES_SECONDARY_APPROVAL' : 'WORKFLOW_RULE_EVALUATED',
    };

    return withTransaction(async (tx) => {
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: result.auditAction,
        subjectType: input.subjectType,
        subjectId: input.subjectId ?? actor.userId,
        afterJson: result,
        ip: actor.ip,
      });
      return result;
    });
  }

}
