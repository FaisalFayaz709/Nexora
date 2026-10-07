import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
const permissions = JSON.parse(await readFile(join(here, 'permissions.seed.json'), 'utf8'));
const featureFlags = JSON.parse(await readFile(join(here, 'feature-flags.seed.json'), 'utf8'));
const moduleRegistry = JSON.parse(await readFile(join(here, 'module-registry.seed.json'), 'utf8'));
const importTemplates = JSON.parse(await readFile(join(here, 'import-templates.seed.json'), 'utf8'));
const baseline = JSON.parse(await readFile(join(here, 'baseline.seed.json'), 'utf8'));
const prisma = new PrismaClient();

const fiscalYear = Number(process.env.NEXORA_SEED_FISCAL_YEAR ?? new Date().getUTCFullYear());

async function ensureDepartment(tx, organizationId, branchId, department) {
  const existing = await tx.department.findFirst({
    where: { organizationId, branchId, name: department.name },
    select: { id: true },
  });
  if (existing) {
    await tx.department.update({ where: { id: existing.id }, data: { name: department.name } });
    return existing.id;
  }
  const created = await tx.department.create({
    data: { id: department.id, organizationId, branchId, name: department.name },
    select: { id: true },
  });
  return created.id;
}

function permissionsForSelector(allPermissions, selector) {
  if (selector === 'all') return allPermissions.map((permission) => permission.key);
  if (selector === 'readOnly') {
    return allPermissions
      .map((permission) => permission.key)
      .filter((key) =>
        key.endsWith('.view') ||
        key.includes('.view_') ||
        key === 'inventory.view' ||
        key === 'approval.view' ||
        key === 'document.view' ||
        key === 'report.view' ||
        key === 'account.view' ||
        key === 'finance.view',
      );
  }
  return Array.isArray(selector) ? selector : [];
}

try {
  await prisma.$transaction(async (tx) => {
    for (const { key, description } of permissions) {
      await tx.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
    }

    for (const flag of featureFlags) {
      await tx.featureFlag.upsert({
        where: { key: flag.key },
        update: { moduleKey: flag.moduleKey, name: flag.name, defaultEnabled: flag.defaultEnabled },
        create: flag,
      });
    }

    for (const plan of baseline.saasPlans ?? []) {
      await tx.saaSPlan.upsert({
        where: { key: plan.key },
        update: { name: plan.name, moduleKeys: plan.moduleKeys, limitsJson: plan.limitsJson, active: plan.active },
        create: plan,
      });
    }

    const organization = baseline.organization;
    await tx.organization.upsert({
      where: { code: organization.code },
      update: {
        name: organization.name,
        currency: organization.currency,
        timezone: organization.timezone,
        locale: organization.locale,
        status: organization.status,
      },
      create: organization,
    });

    const branchIdsByCode = new Map();
    for (const branch of baseline.branches) {
      await tx.branch.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: branch.code } },
        update: { name: branch.name },
        create: { id: branch.id, organizationId: organization.id, code: branch.code, name: branch.name },
      });
      branchIdsByCode.set(branch.code, branch.id);
    }

    for (const setting of baseline.settings ?? []) {
      await tx.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: organization.id, key: setting.key } },
        update: { valueJson: setting.valueJson },
        create: { organizationId: organization.id, key: setting.key, valueJson: setting.valueJson },
      });
    }

    const departmentIdsByName = new Map();
    for (const department of baseline.departments) {
      const branchId = branchIdsByCode.get(department.branchCode);
      if (!branchId) throw new Error(`Missing seed branch for department ${department.name}: ${department.branchCode}`);
      const departmentId = await ensureDepartment(tx, organization.id, branchId, department);
      departmentIdsByName.set(department.name, departmentId);
    }

    const allPermissionRows = await tx.permission.findMany({ select: { id: true, key: true } });
    const permissionByKey = new Map(allPermissionRows.map((permission) => [permission.key, permission]));
    const roleIdsByName = new Map();
    for (const role of baseline.roles) {
      await tx.role.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: role.name } },
        update: { systemRole: role.systemRole, mfaRequired: role.mfaRequired },
        create: {
          id: role.id,
          organizationId: organization.id,
          name: role.name,
          systemRole: role.systemRole,
          mfaRequired: role.mfaRequired,
        },
      });
      roleIdsByName.set(role.name, role.id);
      const selectedPermissionKeys = permissionsForSelector(allPermissionRows, role.permissionSelector);
      const rolePermissionRows = selectedPermissionKeys
        .map((key) => permissionByKey.get(key))
        .filter(Boolean)
        .map((permission) => ({ roleId: role.id, permissionId: permission.id }));
      if (rolePermissionRows.length) {
        await tx.rolePermission.createMany({ data: rolePermissionRows, skipDuplicates: true });
      }
    }

    const defaultDepartmentId = departmentIdsByName.get('Management') ?? [...departmentIdsByName.values()][0];
    const defaultBranchId = branchIdsByCode.get(baseline.branches[0].code);
    for (const user of baseline.users) {
      await tx.user.upsert({
        where: { email: user.email },
        update: { status: user.status },
        create: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          status: user.status,
        },
      });
      const membership = await tx.organizationMembership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
        update: { branchId: branchIdsByCode.get(user.branchCode) ?? defaultBranchId, status: 'ACTIVE' },
        create: {
          userId: user.id,
          organizationId: organization.id,
          branchId: branchIdsByCode.get(user.branchCode) ?? defaultBranchId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      for (const roleName of user.roles) {
        const roleId = roleIdsByName.get(roleName);
        if (roleId) await tx.userRole.createMany({ data: [{ membershipId: membership.id, roleId }], skipDuplicates: true });
      }
      await tx.employee.upsert({
        where: { organizationId_employeeNo: { organizationId: organization.id, employeeNo: `EMP-${user.id.slice(-3)}` } },
        update: { userId: user.id, branchId: branchIdsByCode.get(user.branchCode) ?? defaultBranchId, departmentId: defaultDepartmentId, status: 'ACTIVE' },
        create: {
          organizationId: organization.id,
          userId: user.id,
          branchId: branchIdsByCode.get(user.branchCode) ?? defaultBranchId,
          departmentId: defaultDepartmentId,
          employeeNo: `EMP-${user.id.slice(-3)}`,
          name: user.email.split('@')[0].replace(/[._-]/g, ' '),
          status: 'ACTIVE',
        },
      });
    }

    for (const unit of baseline.unitsOfMeasure) {
      await tx.unitOfMeasure.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: unit.code } },
        update: { name: unit.name, precision: unit.precision },
        create: { id: unit.id, organizationId: organization.id, code: unit.code, name: unit.name, precision: unit.precision },
      });
    }

    for (const category of baseline.productCategories) {
      await tx.productCategory.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: category.name } },
        update: { name: category.name },
        create: { id: category.id, organizationId: organization.id, name: category.name },
      });
    }

    const unitsByCode = new Map((await tx.unitOfMeasure.findMany({ where: { organizationId: organization.id } })).map((unit) => [unit.code, unit]));
    const categoriesByName = new Map((await tx.productCategory.findMany({ where: { organizationId: organization.id } })).map((category) => [category.name, category]));
    for (const product of baseline.products) {
      const category = categoriesByName.get(product.categoryName);
      const unit = unitsByCode.get(product.unitCode);
      if (!category || !unit) throw new Error(`Missing category/unit for product ${product.sku}`);
      await tx.product.upsert({
        where: { organizationId_sku: { organizationId: organization.id, sku: product.sku } },
        update: {
          categoryId: category.id,
          name: product.name,
          unitId: unit.id,
          trackingType: product.trackingType,
          standardCost: product.standardCost,
          salesPrice: product.salesPrice,
          minStock: product.minStock,
          maxStock: product.maxStock,
        },
        create: {
          id: product.id,
          organizationId: organization.id,
          categoryId: category.id,
          sku: product.sku,
          name: product.name,
          unitId: unit.id,
          trackingType: product.trackingType,
          standardCost: product.standardCost,
          salesPrice: product.salesPrice,
          minStock: product.minStock,
          maxStock: product.maxStock,
        },
      });
    }

    for (const warehouse of baseline.warehouses) {
      const branchId = branchIdsByCode.get(warehouse.branchCode);
      if (!branchId) throw new Error(`Missing branch for warehouse ${warehouse.code}`);
      await tx.warehouse.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: warehouse.code } },
        update: { branchId, name: warehouse.name, status: warehouse.status },
        create: { id: warehouse.id, organizationId: organization.id, branchId, code: warehouse.code, name: warehouse.name, status: warehouse.status },
      });
      for (const location of warehouse.locations ?? []) {
        await tx.warehouseLocation.upsert({
          where: { warehouseId_code: { warehouseId: warehouse.id, code: location.code } },
          update: { name: location.name, type: location.type },
          create: { id: location.id, warehouseId: warehouse.id, code: location.code, name: location.name, type: location.type },
        });
      }
    }

    for (const customer of baseline.customers) {
      await tx.customer.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: customer.code } },
        update: { name: customer.name, taxNo: customer.taxNo, status: customer.status, creditLimit: customer.creditLimit },
        create: { ...customer, organizationId: organization.id },
      });
    }

    for (const vendor of baseline.vendors) {
      await tx.vendor.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: vendor.code } },
        update: {
          name: vendor.name,
          taxNo: vendor.taxNo,
          status: vendor.status,
          riskScore: vendor.riskScore,
          riskRating: vendor.riskRating,
          documentsVerifiedAt: vendor.documentsVerifiedAt ? new Date(vendor.documentsVerifiedAt) : null,
          bankVerifiedAt: vendor.bankVerifiedAt ? new Date(vendor.bankVerifiedAt) : null,
          approvedCategoryIdsJson: vendor.approvedCategoryIdsJson ?? [],
          paymentTerms: vendor.paymentTerms,
        },
        create: {
          ...vendor,
          organizationId: organization.id,
          documentsVerifiedAt: vendor.documentsVerifiedAt ? new Date(vendor.documentsVerifiedAt) : null,
          bankVerifiedAt: vendor.bankVerifiedAt ? new Date(vendor.bankVerifiedAt) : null,
          approvedCategoryIdsJson: vendor.approvedCategoryIdsJson ?? [],
        },
      });
    }

    for (const account of baseline.accounts) {
      await tx.account.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: account.code } },
        update: { name: account.name, type: account.type, active: account.active },
        create: { ...account, organizationId: organization.id },
      });
    }

    const moduleKeys = moduleRegistry.map((module) => module.key);
    for (const moduleConfig of moduleRegistry) {
      await tx.moduleConfiguration.upsert({
        where: { organizationId_moduleKey: { organizationId: organization.id, moduleKey: moduleConfig.key } },
        update: { enabled: moduleConfig.defaultEnabled, configJson: { configurable: moduleConfig.configurable } },
        create: {
          organizationId: organization.id,
          moduleKey: moduleConfig.key,
          enabled: moduleConfig.defaultEnabled,
          configJson: { configurable: moduleConfig.configurable },
        },
      });
    }

    for (const flag of featureFlags) {
      const savedFlag = await tx.featureFlag.findUniqueOrThrow({ where: { key: flag.key }, select: { id: true } });
      await tx.organizationFeature.upsert({
        where: { organizationId_featureFlagId: { organizationId: organization.id, featureFlagId: savedFlag.id } },
        update: { enabled: flag.defaultEnabled, configJson: { seeded: true } },
        create: { organizationId: organization.id, featureFlagId: savedFlag.id, enabled: flag.defaultEnabled, configJson: { seeded: true } },
      });
    }



    for (const template of importTemplates) {
      await tx.importTemplate.upsert({
        where: { organizationId_subjectType_name: { organizationId: organization.id, subjectType: template.subjectType, name: template.name } },
        update: { columnsJson: template.columns, active: true },
        create: { organizationId: organization.id, subjectType: template.subjectType, name: template.name, columnsJson: template.columns, active: true },
      });
    }


    for (const rule of baseline.businessRules ?? []) {
      await tx.businessRule.upsert({
        where: {
          organizationId_triggerType_name: {
            organizationId: organization.id,
            triggerType: rule.triggerType,
            name: rule.name,
          },
        },
        update: {
          subjectType: rule.subjectType,
          description: rule.description ?? null,
          severity: rule.severity,
          conditionJson: rule.conditionJson,
          actionsJson: rule.actionsJson,
          active: rule.active,
        },
        create: {
          ...rule,
          organizationId: organization.id,
          branchId: null,
        },
      });
    }

    for (const sequence of baseline.numberSequences) {
      await tx.numberSequence.upsert({
        where: {
          organizationId_branchScopeKey_entityType_fiscalYear: {
            organizationId: organization.id,
            branchScopeKey: 'GLOBAL',
            entityType: sequence.entityType,
            fiscalYear,
          },
        },
        update: { prefix: sequence.prefix, padding: sequence.padding, resetPolicy: 'FISCAL_YEAR' },
        create: {
          organizationId: organization.id,
          branchId: null,
          branchScopeKey: 'GLOBAL',
          entityType: sequence.entityType,
          prefix: sequence.prefix,
          fiscalYear,
          currentNumber: 0n,
          padding: sequence.padding,
          resetPolicy: 'FISCAL_YEAR',
        },
      });
    }

    // Keep at least one open period for finance seed-dependent smoke tests.
    await tx.financialPeriod.upsert({
      where: {
        organizationId_startDate_endDate: {
          organizationId: organization.id,
          startDate: new Date(`${fiscalYear}-01-01T00:00:00.000Z`),
          endDate: new Date(`${fiscalYear}-12-31T00:00:00.000Z`),
        },
      },
      update: { status: 'OPEN' },
      create: {
        organizationId: organization.id,
        startDate: new Date(`${fiscalYear}-01-01T00:00:00.000Z`),
        endDate: new Date(`${fiscalYear}-12-31T00:00:00.000Z`),
        status: 'OPEN',
      },
    });

    if (!moduleKeys.includes('identity') || !moduleKeys.includes('procurement') || !moduleKeys.includes('finance')) {
      throw new Error('Module registry seed does not include required locked modules.');
    }
  });

  console.log(`Seeded ${permissions.length} permissions, ${featureFlags.length} feature flags, ${moduleRegistry.length} module configurations, ${importTemplates.length} import templates and the NEXORA demo tenant baseline.`);
} finally {
  await prisma.$disconnect();
}
