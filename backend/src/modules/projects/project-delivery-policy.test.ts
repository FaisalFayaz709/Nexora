import { describe, expect, it } from 'vitest';
import { Prisma } from '@nexora/database';
import {
  assertBomLineQuantities,
  assertBudgetLineTotals,
  assertProjectMutable,
  assertProjectSchedule,
  assertTaskDependencyGraph,
  assertTaskProgress,
  calculateBomShortagePlan,
  calculateProjectCostSnapshot,
  ProjectDeliveryChecklist,
  ProjectDeliveryTransactionBoundary,
} from './project-delivery-policy.js';

describe('C6 project delivery policy', () => {
  it('guards schedules, mutability and task dependency graphs', () => {
    expect(() => assertProjectSchedule(new Date('2026-09-10'), new Date('2026-09-09'))).toThrow('Due date');
    expect(() => assertProjectMutable('HANDED_OVER', 'PROJECT_BOM_UPSERT')).toThrow('not allowed');
    expect(() => assertTaskDependencyGraph('task-1', ['task-1'])).toThrow('depend on itself');
    expect(() => assertTaskProgress('COMPLETED', 90)).toThrow('100 percent');
  });

  it('calculates BOM shortages using decimals and free-stock coverage', () => {
    const [line] = calculateBomShortagePlan([
      {
        productId: 'camera',
        requiredQty: new Prisma.Decimal(100),
        reservedQty: new Prisma.Decimal(20),
        issuedQty: new Prisma.Decimal(10),
        freeQty: new Prisma.Decimal(50),
      },
    ]);
    expect(line.shortageQty.toString()).toBe('20');
  });

  it('summarizes project budget and costing without floating point money', () => {
    assertBomLineQuantities([
      { productId: 'product-1', requiredQty: new Prisma.Decimal('10.0000') },
    ]);
    const budget = assertBudgetLineTotals([
      { category: 'MATERIAL', budgetAmount: new Prisma.Decimal('1000.00') },
      { category: 'LABOUR', budgetAmount: new Prisma.Decimal('500.00') },
    ]);
    const snapshot = calculateProjectCostSnapshot({
      contractValue: new Prisma.Decimal('5000.00'),
      budget,
      committedCost: new Prisma.Decimal('300.00'),
      actualMaterialCost: new Prisma.Decimal('700.00'),
      actualOtherCost: new Prisma.Decimal('200.00'),
    });
    expect(snapshot.projectCostingReadModel).toBe('ProjectCostingReadModel');
    expect(snapshot.totalActualCost.toFixed(2)).toBe('900.00');
    expect(snapshot.budgetSummary.readiness).toBe('PROJECT_BUDGET_SUMMARY_READY');
  });

  it('declares locked project transaction boundaries', () => {
    expect(ProjectDeliveryTransactionBoundary.materialRequirement).toContain('one PostgreSQL transaction');
    expect(ProjectDeliveryChecklist).toContain('no-async-project-status-budget-bom-or-costing-mutation');
  });
});
