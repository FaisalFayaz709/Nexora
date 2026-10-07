import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class PlatformConfigurationRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient) {
    return new PlatformConfigurationRepository(db);
  }

  findOrganizationSetting(organizationId: string, key: string) {
    return this.db.organizationSetting.findUnique({
      where: { organizationId_key: { organizationId, key } },
      select: { valueJson: true },
    });
  }

  listFeatureFlags() {
    return this.db.featureFlag.findMany({
      orderBy: [{ moduleKey: 'asc' }, { key: 'asc' }],
    });
  }

  listOrganizationFeatures(organizationId: string) {
    return this.db.organizationFeature.findMany({
      where: { organizationId },
      include: { featureFlag: true },
    });
  }

  findFeatureFlagByKey(key: string) {
    return this.db.featureFlag.findUnique({ where: { key } });
  }

  upsertOrganizationFeature(
    organizationId: string,
    featureFlagId: string,
    enabled: boolean,
    configJson: unknown,
  ) {
    return this.db.organizationFeature.upsert({
      where: {
        organizationId_featureFlagId: { organizationId, featureFlagId },
      },
      update: {
        enabled,
        configJson: configJson as never,
      },
      create: {
        organizationId,
        featureFlagId,
        enabled,
        configJson: configJson as never,
      },
      include: { featureFlag: true },
    });
  }

  listModuleConfigurations(organizationId: string) {
    return this.db.moduleConfiguration.findMany({
      where: { organizationId },
      orderBy: { moduleKey: 'asc' },
    });
  }

  findModuleConfiguration(organizationId: string, moduleKey: string) {
    return this.db.moduleConfiguration.findUnique({
      where: {
        organizationId_moduleKey: { organizationId, moduleKey },
      },
    });
  }

  findModuleConfigurationById(organizationId: string, id: string) {
    return this.db.moduleConfiguration.findFirst({
      where: { id, organizationId },
    });
  }

  upsertModuleConfiguration(
    organizationId: string,
    moduleKey: string,
    enabled: boolean,
    configJson: unknown,
  ) {
    return this.db.moduleConfiguration.upsert({
      where: {
        organizationId_moduleKey: { organizationId, moduleKey },
      },
      update: {
        enabled,
        configJson: configJson as never,
      },
      create: {
        organizationId,
        moduleKey,
        enabled,
        configJson: configJson as never,
      },
    });
  }

  updateModuleConfiguration(
    id: string,
    data: { enabled?: boolean; configJson?: unknown },
  ) {
    return this.db.moduleConfiguration.update({
      where: { id },
      data: {
        ...(data.enabled === undefined ? {} : { enabled: data.enabled }),
        ...(data.configJson === undefined ? {} : { configJson: data.configJson as never }),
      },
    });
  }

  activeSubscription(organizationId: string) {
    return this.db.saaSSubscription.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      include: { plan: true },
      orderBy: { startsAt: 'desc' },
    });
  }

  appendHistory(
    organizationId: string,
    actorUserId: string | null,
    subjectType: string,
    subjectKey: string,
    beforeJson: unknown,
    afterJson: unknown,
  ) {
    return this.db.systemConfigurationHistory.create({
      data: {
        organizationId,
        actorUserId,
        subjectType,
        subjectKey,
        beforeJson: beforeJson as never,
        afterJson: afterJson as never,
      },
    });
  }
}
