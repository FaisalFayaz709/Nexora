import { type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const approvalsEndpoints = {
  inbox: '/approvals/inbox',
  definitions: '/approval-definitions',
  workflowRules: '/workflow-rules',
  approveApproval: (id: string) => `/approvals/${id}/approve`,
  rejectApproval: (id: string) => `/approvals/${id}/reject`,
  returnApproval: (id: string) => `/approvals/${id}/return`,
  activateWorkflowRule: (id: string) => `/workflow-rules/${id}/activate`,
  deactivateWorkflowRule: (id: string) => `/workflow-rules/${id}/deactivate`,
  evaluateWorkflowRules: '/workflow-rules/evaluate',
} as const;

export const approvalsKeys = createModuleQueryKeys('approvals', { inbox: 'inbox', definitions: 'definitions' });

export const inboxApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(approvalsEndpoints.inbox);
export const definitionsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(approvalsEndpoints.definitions);
export const workflowRulesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(approvalsEndpoints.workflowRules);

export function approveApproval(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.approveApproval(id), body, idempotencyKey); }
export function rejectApproval(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.rejectApproval(id), body, idempotencyKey); }
export function returnApproval(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.returnApproval(id), body, idempotencyKey); }
export function activateWorkflowRule(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.activateWorkflowRule(id), body, idempotencyKey); }
export function deactivateWorkflowRule(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.deactivateWorkflowRule(id), body, idempotencyKey); }
export function evaluateWorkflowRules(body: CommandInput, idempotencyKey?: string) { return postCommand(approvalsEndpoints.evaluateWorkflowRules, body, idempotencyKey); }

export const ApprovalsApiRegistry = { endpoints: approvalsEndpoints, keys: approvalsKeys } as const;
