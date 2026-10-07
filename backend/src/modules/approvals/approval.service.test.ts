import { describe, expect, it } from 'vitest';
import {
  ApprovalConditionSchema,
  CreateApprovalDefinitionSchema,
} from '@nexora/shared';

describe('Approval Engine contracts', () => {
  it('accepts configurable amount conditions and ordered role steps', () => {
    const value = CreateApprovalDefinitionSchema.parse({
      subjectType: 'PurchaseRequest',
      name: 'High value procurement',
      condition: {
        all: [
          { field: 'amount', operator: 'GT', value: 250000 },
          { field: 'amount', operator: 'LTE', value: 1000000 },
        ],
      },
      active: true,
      steps: [
        {
          sequence: 1,
          approverType: 'ROLE',
          approverRef: '11111111-1111-4111-8111-111111111111',
          minApprovals: 1,
        },
        {
          sequence: 2,
          approverType: 'ROLE',
          approverRef: '22222222-2222-4222-8222-222222222222',
          minApprovals: 1,
        },
      ],
    });
    expect(value.steps).toHaveLength(2);
    expect(ApprovalConditionSchema.parse(value.condition)).toBeTruthy();
  });

  it('rejects a USER step that asks the same user for multiple approvals', () => {
    expect(() =>
      CreateApprovalDefinitionSchema.parse({
        subjectType: 'PurchaseRequest',
        name: 'Invalid',
        steps: [
          {
            sequence: 1,
            approverType: 'USER',
            approverRef: '11111111-1111-4111-8111-111111111111',
            minApprovals: 2,
          },
        ],
      }),
    ).toThrow();
  });
});
