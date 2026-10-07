import { Prisma } from '@nexora/database';
import {
  assertProjectBudgetApproval,
  assertProjectBudgetCanBeChanged,
  assertProjectCompletionMatrix,
  assertProjectCompletionReadiness,
  assertProjectCostingLayers,
} from './project-completion-policy.js';

describe('M11 project completion policy', () => {
  it('M11-PROJECT-COMPLETION-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    expect(() => assertProjectCompletionMatrix([
      {
        subject: 'PROJECT_COSTING_READ_MODEL',
        tenantScoped: true,
        rbacGuarded: true,
        sharedContract: true,
        serviceOwnedStateTransition: true,
        auditRequired: false,
        transactionalWhenMutating: false,
      },
    ])).not.toThrow();
  });

  it('M11-PROJECT-COMPLETION-READINESS-BLOCKS-OPEN-WORK', () => {
    expect(() => assertProjectCompletionReadiness({
      openTaskCount: 1,
      pendingMilestoneCount: 0,
      approvedBomCount: 1,
    })).toThrow('Project cannot be completed while open tasks remain.');
  });

  it('M11-PROJECT-BUDGET-DRAFT-ONLY-MUTATION', () => {
    expect(() => assertProjectBudgetCanBeChanged({
      projectStatus: 'ACTIVE',
      budgetStatus: 'APPROVED',
    })).toThrow('Only a DRAFT project budget can be changed.');
  });

  it('M11-PROJECT-BUDGET-APPROVAL-REQUIRES-POSITIVE-LINES', () => {
    expect(() => assertProjectBudgetApproval({
      status: 'DRAFT',
      lineCount: 0,
      totalBudget: new Prisma.Decimal(0),
    })).toThrow('Project budget approval requires at least one positive budget line.');
  });

  it('M11-PROJECT-COSTING-LAYERS-ARE-NON-NEGATIVE-DECIMAL-MONEY', () => {
    expect(() => assertProjectCostingLayers({
      contractValue: new Prisma.Decimal(100),
      budget: new Prisma.Decimal(50),
      committedCost: new Prisma.Decimal(20),
      actualMaterialCost: new Prisma.Decimal(10),
      actualOtherCost: new Prisma.Decimal(5),
    })).not.toThrow();
  });
});
