import { moduleDefinition } from '@nexora/shared';
import { AppError } from '../../../core/http/errors.js';
import { PlatformConfigurationRepository } from './platform-configuration.repository.js';
import { SaaSPlanGuard } from './saas-plan.guard.js';

export class PlatformAccessFacade {
  constructor(
    private readonly repository = new PlatformConfigurationRepository(),
    private readonly saasPlanGuard = new SaaSPlanGuard(repository),
  ) {}

  async receiptTolerancePct(organizationId: string): Promise<number> {
    const row = await this.repository.findOrganizationSetting(organizationId, 'procurement.receiptTolerancePct');
    const value = row?.valueJson;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) return Number(value);
    return 0;
  }

  async technicianVisitPolicy(organizationId: string): Promise<{
    locationEnabled: boolean;
    retentionDays: number;
    requirePhotoProof: boolean;
    requireCustomerSignature: boolean;
  }> {
    const configuration = await this.repository.findModuleConfiguration(organizationId, 'service');
    const raw = configuration?.configJson;
    const config = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const candidate = Number(config.technicianLocationRetentionDays);
    const retentionDays = Number.isInteger(candidate) && candidate >= 1 && candidate <= 3650 ? candidate : 30;
    return {
      locationEnabled: config.technicianLocationEnabled === true,
      retentionDays,
      requirePhotoProof: config.requireVisitPhotoProof === true,
      requireCustomerSignature: config.requireCustomerSignatureOnCheckout === true,
    };
  }

  async assertModuleEnabled(organizationId: string, moduleKey: string): Promise<void> {
    const definition = moduleDefinition(moduleKey);
    if (!definition) {
      throw new AppError(500, 'PLATFORM_MODULE_UNKNOWN', 'Unknown internal module key.', {
        moduleKey,
      });
    }

    if (!definition.configurable) return;

    await this.saasPlanGuard.assertModuleAllowed(organizationId, moduleKey);
    const configuration = await this.repository.findModuleConfiguration(
      organizationId,
      moduleKey,
    );

    const enabled = configuration?.enabled ?? definition.defaultEnabled;
    if (!enabled) {
      throw new AppError(
        403,
        'PLATFORM_MODULE_DISABLED',
        'This module is disabled for the active organization.',
        { moduleKey },
      );
    }
  }
}
