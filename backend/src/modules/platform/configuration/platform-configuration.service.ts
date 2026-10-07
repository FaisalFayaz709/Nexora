import { MODULE_REGISTRY, moduleDefinition } from '@nexora/shared';
import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import { PlatformConfigurationRepository } from './platform-configuration.repository.js';
import { SaaSPlanGuard } from './saas-plan.guard.js';

export class PlatformConfigurationService {
  constructor(
    private readonly repository = new PlatformConfigurationRepository(),
    private readonly auditWriter = new AuditWriter(),
    private readonly saasPlanGuard = new SaaSPlanGuard(repository),
  ) {}

  async list(tenant: TenantRequestContext) {
    await this.ensureModuleBaseline(tenant.organizationId);

    const [flags, overrides, modules] = await Promise.all([
      this.repository.listFeatureFlags(),
      this.repository.listOrganizationFeatures(tenant.organizationId),
      this.repository.listModuleConfigurations(tenant.organizationId),
    ]);

    const overrideByFlag = new Map<string, (typeof overrides)[number]>(
      overrides.map((item) => [String(item.featureFlagId), item]),
    );

    return {
      features: flags.map((flag) => {
        const override = overrideByFlag.get(flag.id);
        return {
          id: flag.id,
          key: flag.key,
          moduleKey: flag.moduleKey,
          name: flag.name,
          enabled: override?.enabled ?? flag.defaultEnabled,
          defaultEnabled: flag.defaultEnabled,
        };
      }),
      modules: modules.map((item) => ({
        id: item.id,
        moduleKey: item.moduleKey,
        enabled: item.enabled,
        config: (item.configJson as Record<string, unknown> | null) ?? null,
      })),
    };
  }

  async setFeature(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: { featureKey: string; enabled: boolean; config?: Record<string, unknown> | null },
  ) {
    const flag = await this.repository.findFeatureFlagByKey(input.featureKey);
    if (!flag) {
      throw new AppError(404, 'FEATURE_FLAG_NOT_FOUND', 'Feature flag not found.');
    }

    await this.saasPlanGuard.assertModuleAllowed(tenant.organizationId, flag.moduleKey);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const previous = (
        await repo.listOrganizationFeatures(tenant.organizationId)
      ).find((item) => item.featureFlagId === flag.id);

      const updated = await repo.upsertOrganizationFeature(
        tenant.organizationId,
        flag.id,
        input.enabled,
        input.config ?? null,
      );

      await repo.appendHistory(
        tenant.organizationId,
        actor.userId,
        'OrganizationFeature',
        flag.key,
        previous
          ? { enabled: previous.enabled, config: previous.configJson }
          : null,
        { enabled: updated.enabled, config: updated.configJson },
      );

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'FEATURE_CONFIGURATION_CHANGED',
        subjectType: 'OrganizationFeature',
        subjectId: updated.id,
        beforeJson: previous
          ? { enabled: previous.enabled, config: previous.configJson }
          : null,
        afterJson: { enabled: updated.enabled, config: updated.configJson },
        ip: actor.ip,
      });

      return {
        id: flag.id,
        key: flag.key,
        moduleKey: flag.moduleKey,
        name: flag.name,
        enabled: updated.enabled,
        defaultEnabled: flag.defaultEnabled,
      };
    });
  }

  async updateModule(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: { enabled?: boolean; config?: Record<string, unknown> | null },
  ) {
    const existing = await this.repository.findModuleConfigurationById(
      tenant.organizationId,
      id,
    );
    if (!existing) {
      throw new AppError(404, 'MODULE_CONFIGURATION_NOT_FOUND', 'Module configuration not found.');
    }

    const definition = moduleDefinition(existing.moduleKey);
    if (!definition?.configurable) {
      throw new AppError(
        409,
        'MODULE_CONFIGURATION_LOCKED',
        'Core module configuration cannot be disabled.',
      );
    }

    await this.saasPlanGuard.assertModuleAllowed(
      tenant.organizationId,
      existing.moduleKey,
    );

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const updated = await repo.updateModuleConfiguration(existing.id, {
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...(input.config === undefined ? {} : { configJson: input.config }),
      });

      await repo.appendHistory(
        tenant.organizationId,
        actor.userId,
        'ModuleConfiguration',
        existing.moduleKey,
        { enabled: existing.enabled, config: existing.configJson },
        { enabled: updated.enabled, config: updated.configJson },
      );

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'MODULE_CONFIGURATION_CHANGED',
        subjectType: 'ModuleConfiguration',
        subjectId: updated.id,
        beforeJson: { enabled: existing.enabled, config: existing.configJson },
        afterJson: { enabled: updated.enabled, config: updated.configJson },
        ip: actor.ip,
      });

      return {
        id: updated.id,
        moduleKey: updated.moduleKey,
        enabled: updated.enabled,
        config: (updated.configJson as Record<string, unknown> | null) ?? null,
      };
    });
  }

  private async ensureModuleBaseline(organizationId: string): Promise<void> {
    for (const module of MODULE_REGISTRY) {
      await this.repository.upsertModuleConfiguration(
        organizationId,
        module.key,
        module.defaultEnabled,
        null,
      );
    }
  }
}
