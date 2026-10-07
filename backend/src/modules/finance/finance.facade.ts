import type { Prisma, TransactionClient } from '@nexora/database';
import type { ApprovalSubjectDecision, ApprovalSubjectHandler } from '../approvals/index.js';
import { FinanceService } from './finance.service.js';

export class FinanceFacade implements ApprovalSubjectHandler {
  constructor(private readonly service: FinanceService) {}
  postCommercialJournal(
    tx: TransactionClient,
    input: {
      organizationId: string;
      actorUserId: string;
      referenceType: string;
      referenceId: string;
      lines: Array<{
        accountId: string;
        debit?: Prisma.Decimal | string | number;
        credit?: Prisma.Decimal | string | number;
        projectId?: string | null;
        branchId?: string | null;
      }>;
    },
  ) {
    return this.service.postCommercialJournal(tx, input);
  }

  ensureCommercialAccounts(tx: TransactionClient, organizationId: string) {
    return this.service.ensureCommercialAccounts(tx, organizationId);
  }

  projectCostReadModel(organizationId: string, projectId: string) {
    return this.service.projectCostReadModel(organizationId, projectId);
  }

  applyApprovalDecision(tx: TransactionClient, input: ApprovalSubjectDecision): Promise<void> {
    return this.service.applyApprovalDecision(tx, input);
  }
}
