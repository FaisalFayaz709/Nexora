import { randomUUID } from 'node:crypto';
import { prisma } from '@nexora/database';
import type { TenantRequestContext } from '../core/tenant/tenant-context.js';

export interface RuntimeTenantFixtureInput {
  readonly codePrefix?: string;
  readonly permissions?: readonly string[];
  readonly branchScoped?: boolean;
}

export interface RuntimeTenantFixture {
  readonly suffix: string;
  readonly organizationId: string;
  readonly branchId: string | null;
  readonly userId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly tenant: TenantRequestContext;
  readonly permissionKeys: readonly string[];
}

export async function createRuntimeTenantFixture(input: RuntimeTenantFixtureInput = {}): Promise<RuntimeTenantFixture> {
  const suffix = randomUUID().slice(0, 12);
  const permissions = input.permissions ?? ['audit.view'];
  const organization = await prisma.organization.create({
    data: {
      code: `${input.codePrefix ?? 'RTH'}-${suffix}`,
      name: `Runtime Harness Tenant ${suffix}`,
      currency: 'USD',
      timezone: 'UTC',
      locale: 'en',
      status: 'ACTIVE',
    },
  });
  const branch = input.branchScoped === false
    ? null
    : await prisma.branch.create({
        data: {
          organizationId: organization.id,
          code: `BR-${suffix}`,
          name: `Runtime Branch ${suffix}`,
        },
      });

  const user = await prisma.user.create({
    data: {
      email: `runtime-${suffix}@example.invalid`,
      passwordHash: 'runtime-fixture-not-a-real-password',
      status: 'ACTIVE',
    },
  });
  const role = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: `Runtime Role ${suffix}`,
      systemRole: false,
      mfaRequired: false,
    },
  });

  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      create: { key, description: `Runtime harness permission ${key}` },
      update: {},
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  const membership = await prisma.organizationMembership.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      branchId: branch?.id ?? null,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { membershipId: membership.id, roleId: role.id } });

  return {
    suffix,
    organizationId: organization.id,
    branchId: branch?.id ?? null,
    userId: user.id,
    membershipId: membership.id,
    roleId: role.id,
    tenant: {
      membershipId: membership.id,
      organizationId: organization.id,
      branchId: branch?.id ?? null,
    },
    permissionKeys: permissions,
  };
}

export async function createTwoTenantIsolationFixtures(permissionKeys: readonly string[] = ['audit.view']) {
  const tenantA = await createRuntimeTenantFixture({ codePrefix: 'RTH-A', permissions: permissionKeys });
  const tenantB = await createRuntimeTenantFixture({ codePrefix: 'RTH-B', permissions: permissionKeys });
  return { tenantA, tenantB };
}

export async function cleanupRuntimeTenantFixture(fixture: RuntimeTenantFixture) {
  // This cleanup is intentionally best-effort because module tests may create many dependent rows.
  // Tests should use unique suffixes and may rely on disposable databases for full certification runs.
  const organizationId = fixture.organizationId;
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { membershipId: fixture.membershipId } });
    await tx.rolePermission.deleteMany({ where: { roleId: fixture.roleId } });
    await tx.organizationMembership.deleteMany({ where: { id: fixture.membershipId } });
    await tx.role.deleteMany({ where: { id: fixture.roleId, organizationId } });
    await tx.branch.deleteMany({ where: { organizationId } });
    await tx.organization.deleteMany({ where: { id: organizationId } });
    await tx.user.deleteMany({ where: { id: fixture.userId } });
  });
}
