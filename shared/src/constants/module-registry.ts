export const MODULE_REGISTRY = [
  { key: 'identity', configurable: false, defaultEnabled: true },
  { key: 'organization', configurable: false, defaultEnabled: true },
  { key: 'customers', configurable: true, defaultEnabled: true },
  { key: 'crm', configurable: true, defaultEnabled: true },
  { key: 'vendors', configurable: true, defaultEnabled: true },
  { key: 'hr', configurable: true, defaultEnabled: true },
  { key: 'inventory', configurable: true, defaultEnabled: true },
  { key: 'procurement', configurable: true, defaultEnabled: true },
  { key: 'approvals', configurable: true, defaultEnabled: true },
  { key: 'projects', configurable: true, defaultEnabled: true },
  { key: 'assets', configurable: true, defaultEnabled: true },
  { key: 'service', configurable: true, defaultEnabled: true },
  { key: 'maintenance', configurable: true, defaultEnabled: true },
  { key: 'finance', configurable: true, defaultEnabled: true },
  { key: 'reports', configurable: true, defaultEnabled: true },
  { key: 'documents', configurable: true, defaultEnabled: true },
  { key: 'portals', configurable: true, defaultEnabled: true },
  { key: 'notifications', configurable: true, defaultEnabled: true },
  { key: 'audit', configurable: true, defaultEnabled: true },
  { key: 'imports', configurable: true, defaultEnabled: true },
  { key: 'platform', configurable: true, defaultEnabled: true },
  { key: 'integrations', configurable: true, defaultEnabled: false },
  { key: 'saas', configurable: true, defaultEnabled: false },
] as const;

export type ModuleKey = (typeof MODULE_REGISTRY)[number]['key'];

export function moduleDefinition(key: string) {
  return MODULE_REGISTRY.find((item) => item.key === key) ?? null;
}
