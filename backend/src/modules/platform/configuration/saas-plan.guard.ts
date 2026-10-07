import { AppError } from '../../../core/http/errors.js';
import { PlatformConfigurationRepository } from './platform-configuration.repository.js';

function moduleKeysFromPlan(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export class SaaSPlanGuard {
  constructor(private readonly repository = new PlatformConfigurationRepository()) {}

  async assertModuleAllowed(organizationId: string, moduleKey: string): Promise<void> {
    const subscription = await this.repository.activeSubscription(organizationId);
    if (!subscription) {
      // Self-hosted/unmetered organizations have no SaaS subscription record.
      return;
    }

    const moduleKeys = moduleKeysFromPlan(subscription.plan.moduleKeys);
    if (moduleKeys.length > 0 && !moduleKeys.includes(moduleKey)) {
      throw new AppError(
        403,
        'SAAS_MODULE_NOT_INCLUDED',
        'The active SaaS plan does not include this module.',
        { moduleKey, plan: subscription.plan.key },
      );
    }
  }
}
