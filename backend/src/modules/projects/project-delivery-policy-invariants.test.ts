import { describe, expect, it } from 'vitest';
import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import {
  assertBomLineQuantities,
  assertProjectStatusTransition,
  assertTaskDependencyGraph,
} from './project-delivery-policy.js';

function expectAppErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error(`Expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('Project delivery locked policy invariants', () => {
  it('blocks invalid project state transitions with the locked error code', () => {
    expectAppErrorCode(
      () =>
        assertProjectStatusTransition('DRAFT', 'HANDED_OVER', {
          DRAFT: ['PLANNED', 'CANCELLED'],
          PLANNED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
          ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
          ON_HOLD: ['ACTIVE', 'CANCELLED'],
          COMPLETED: [],
          HANDED_OVER: [],
          CANCELLED: [],
        }),
      'PROJECT_INVALID_STATE_TRANSITION',
    );
  });

  it('blocks project task self dependencies with the locked error code', () => {
    expectAppErrorCode(
      () => assertTaskDependencyGraph('task-1', ['task-2', 'task-1']),
      'PROJECT_TASK_SELF_DEPENDENCY',
    );
  });

  it('blocks duplicate BOM products with the locked error code', () => {
    expectAppErrorCode(
      () =>
        assertBomLineQuantities([
          { productId: 'camera', requiredQty: new Prisma.Decimal('5.0000') },
          { productId: 'camera', requiredQty: new Prisma.Decimal('7.0000') },
        ]),
      'PROJECT_BOM_DUPLICATE_PRODUCT',
    );
  });
});
