import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '@nexora/database';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import type { OrganizationFacade } from '../../organization/index.js';
import { NumberSequenceService } from './number-sequence.service.js';

const integration = describe.runIf(process.env.RUN_INTEGRATION_TESTS === '1');

integration('PostgreSQL number sequence concurrency acceptance', () => {
  it('prevents duplicates and isolates organization/branch/fiscal-year scopes', async () => {
    const suffix = randomUUID().slice(0, 8);
    const organization = await prisma.organization.create({
      data: {
        code: `NS-${suffix}`,
        name: 'Number Sequence Test',
        currency: 'USD',
        timezone: 'UTC',
        locale: 'en',
        status: 'ACTIVE',
      },
    });
    const branch = await prisma.branch.create({
      data: {
        organizationId: organization.id,
        code: `B-${suffix}`,
        name: 'Test Branch',
      },
    });
    const secondBranch = await prisma.branch.create({
      data: {
        organizationId: organization.id,
        code: `B2-${suffix}`,
        name: 'Second Branch',
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `number-sequence-${suffix}@example.invalid`,
        passwordHash: 'test-only-not-used',
        status: 'ACTIVE',
      },
    });

    const organizationFacade = {
      branchExists: async (organizationId: string, branchId: string) =>
        (await prisma.branch.count({ where: { id: branchId, organizationId } })) === 1,
    } as Pick<OrganizationFacade, 'branchExists'>;
    const service = new NumberSequenceService(organizationFacade);

    await prisma.numberSequence.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        branchScopeKey: branch.id,
        entityType: 'TEST_CONCURRENT',
        prefix: 'TC-',
        fiscalYear: 2026,
        currentNumber: 0n,
        padding: 5,
        resetPolicy: 'FISCAL_YEAR',
      },
    });
    await prisma.numberSequence.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        branchScopeKey: branch.id,
        entityType: 'TEST_CONCURRENT',
        prefix: 'TY-',
        fiscalYear: 2027,
        currentNumber: 0n,
        padding: 5,
        resetPolicy: 'FISCAL_YEAR',
      },
    });
    await prisma.numberSequence.create({
      data: {
        organizationId: organization.id,
        branchId: secondBranch.id,
        branchScopeKey: secondBranch.id,
        entityType: 'TEST_CONCURRENT',
        prefix: 'B2-',
        fiscalYear: 2026,
        currentNumber: 0n,
        padding: 5,
        resetPolicy: 'FISCAL_YEAR',
      },
    });
    const orgScope = await prisma.numberSequence.create({
      data: {
        organizationId: organization.id,
        branchId: null,
        branchScopeKey: 'ORG',
        entityType: 'TEST_ORG_SCOPE',
        prefix: 'ORG-',
        fiscalYear: 2026,
        currentNumber: 7n,
        padding: 4,
        resetPolicy: 'MANUAL_BEFORE_ISSUE',
      },
    });

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        service.withBusinessNumber({
          organizationId: organization.id,
          branchId: branch.id,
          entityType: 'TEST_CONCURRENT',
          fiscalYear: 2026,
          targetType: 'OrganizationSetting',
          createTarget: (tx, businessNumber) =>
            tx.organizationSetting.create({
              data: {
                organizationId: organization.id,
                key: `number-test-${index}-${suffix}`,
                valueJson: { businessNumber },
              },
            }),
        }),
      ),
    );

    expect(new Set(results.map((item) => item.businessNumber)).size).toBe(50);
    expect(
      await prisma.numberSequenceReservation.count({
        where: {
          organizationId: organization.id,
          sequence: {
            branchId: branch.id,
            entityType: 'TEST_CONCURRENT',
            fiscalYear: 2026,
          },
          status: 'CONSUMED',
        },
      }),
    ).toBe(50);

    const nextYear = await service.withBusinessNumber({
      organizationId: organization.id,
      branchId: branch.id,
      entityType: 'TEST_CONCURRENT',
      fiscalYear: 2027,
      targetType: 'OrganizationSetting',
      createTarget: (tx, businessNumber) =>
        tx.organizationSetting.create({
          data: {
            organizationId: organization.id,
            key: `year-test-${suffix}`,
            valueJson: { businessNumber },
          },
        }),
    });
    expect(nextYear.businessNumber).toBe('TY-00001');

    const branchTwo = await service.withBusinessNumber({
      organizationId: organization.id,
      branchId: secondBranch.id,
      entityType: 'TEST_CONCURRENT',
      fiscalYear: 2026,
      targetType: 'OrganizationSetting',
      createTarget: (tx, businessNumber) =>
        tx.organizationSetting.create({
          data: {
            organizationId: organization.id,
            key: `branch-two-${suffix}`,
            valueJson: { businessNumber },
          },
        }),
    });
    expect(branchTwo.businessNumber).toBe('B2-00001');

    const tenant: TenantRequestContext = {
      membershipId: randomUUID(),
      organizationId: organization.id,
      branchId: null,
    };
    await service.reset(
      tenant,
      { userId: user.id, ip: '127.0.0.1' },
      orgScope.id,
      'Reset unused configuration before first issue',
    );
    const resetRow = await prisma.numberSequence.findUniqueOrThrow({
      where: { id: orgScope.id },
    });
    expect(resetRow.currentNumber).toBe(0n);

    const issuedSequence = await prisma.numberSequence.findUniqueOrThrow({
      where: {
        organizationId_branchScopeKey_entityType_fiscalYear: {
          organizationId: organization.id,
          branchScopeKey: branch.id,
          entityType: 'TEST_CONCURRENT',
          fiscalYear: 2026,
        },
      },
    });
    await expect(
      service.reset(
        tenant,
        { userId: user.id, ip: '127.0.0.1' },
        issuedSequence.id,
        'Unsafe reset attempt',
      ),
    ).rejects.toMatchObject({ code: 'NUMBER_SEQUENCE_RESET_NOT_ALLOWED_AFTER_ISSUE' });
  }, 45_000);
});
