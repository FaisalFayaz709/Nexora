import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  UuidSchema,
} from '../common';

export const FeatureConfigurationContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_APPENDIX_F_FIELDS_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const SetOrganizationFeatureSchema = z.object({
  featureKey: z.string().min(1).max(160),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const UpdateModuleConfigurationSchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one configuration field is required');

export const FeatureViewSchema = z.object({
  id: UuidSchema,
  key: z.string(),
  moduleKey: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  defaultEnabled: z.boolean(),
});

export const ModuleConfigurationViewSchema = z.object({
  id: UuidSchema,
  moduleKey: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).nullable(),
});

export const FeatureListResponseSchema = apiDataEnvelope(
  z.object({
    features: z.array(FeatureViewSchema),
    modules: z.array(ModuleConfigurationViewSchema),
  }),
);

export const OrganizationFeatureResponseSchema = apiDataEnvelope(FeatureViewSchema);
export const ModuleConfigurationResponseSchema = apiDataEnvelope(ModuleConfigurationViewSchema);
