import type { TransactionClient } from '@nexora/database';
import type { ApprovalAction } from '@nexora/shared';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { ApprovalService } from './approval.service.js';

export class ApprovalFacade {
  constructor(private readonly service: ApprovalService) {}

  requestApproval(
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
    return this.service.requestApproval(tx, input);
  }

  requestApprovalIfConfigured(
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
    return this.service.requestApprovalIfConfigured(tx, input);
  }

  actBySubject(
    tenant: TenantRequestContext,
    actorUserId: string,
    subjectType: string,
    subjectId: string,
    action: ApprovalAction,
    comment: string | null,
  ) {
    return this.service.actBySubject(
      tenant,
      actorUserId,
      subjectType,
      subjectId,
      action,
      comment,
    );
  }
}
