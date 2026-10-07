import type { TransactionClient } from '@nexora/database';
import type { ApprovalSubjectDecision, ApprovalSubjectHandler } from '../approvals/index.js';
import type { LeaveService } from './leave/leave.service.js';
import type { PayrollService } from './payroll/payroll.service.js';
import { AppError } from '../../core/http/errors.js';
export class HrFacade implements ApprovalSubjectHandler {
  constructor(private readonly leave: LeaveService, private readonly payroll: PayrollService) {}
  async applyApprovalDecision(tx: TransactionClient, input: ApprovalSubjectDecision): Promise<void> {
    if (input.subjectType === 'LeaveRequest') { await this.leave.applyApprovalDecision(tx, input); return; }
    if (input.subjectType === 'PayrollRun') { await this.payroll.applyApprovalDecision(tx, input); return; }
    throw new AppError(409, 'HR_APPROVAL_SUBJECT_UNSUPPORTED', 'HR approval subject is not supported.');
  }
}
