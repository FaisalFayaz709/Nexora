import { createCrudResourceApi, createModuleQueryKeys } from '@/lib/module-api';

export const organizationEndpoints = {
  branches: '/branches',
  departments: '/departments',
  teams: '/teams',
  organizationSettings: '/organization-settings',
  numberSequences: '/number-sequences',
  features: '/features',
  organizationFeatures: '/organization-features',
  moduleConfigurations: '/module-configurations',
} as const;

export const organizationKeys = createModuleQueryKeys('organization', {
  branches: 'branches',
  departments: 'departments',
  teams: 'teams',
  organizationSettings: 'organization-settings',
  numberSequences: 'number-sequences',
  features: 'features',
  organizationFeatures: 'organization-features',
  moduleConfigurations: 'module-configurations',
});

export const branchesApi = createCrudResourceApi(organizationEndpoints.branches);
export const departmentsApi = createCrudResourceApi(organizationEndpoints.departments);
export const teamsApi = createCrudResourceApi(organizationEndpoints.teams);
export const organizationSettingsApi = createCrudResourceApi(organizationEndpoints.organizationSettings);
export const numberSequencesApi = createCrudResourceApi(organizationEndpoints.numberSequences);
export const organizationFeaturesApi = createCrudResourceApi(organizationEndpoints.organizationFeatures);
export const moduleConfigurationsApi = createCrudResourceApi(organizationEndpoints.moduleConfigurations);

export const featuresApi = createCrudResourceApi(organizationEndpoints.features);

export const organizationApi = {
  branches: branchesApi,
  departments: departmentsApi,
  teams: teamsApi,
  organizationSettings: organizationSettingsApi,
  numberSequences: numberSequencesApi,
  features: featuresApi,
  organizationFeatures: organizationFeaturesApi,
  moduleConfigurations: moduleConfigurationsApi,
} as const;
