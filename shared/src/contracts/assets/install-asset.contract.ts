import { z } from 'zod';
import { apiDataEnvelope, IsoDateTimeSchema, NonEmptyStringSchema, UuidSchema } from '../common';
import { AssetStatusSchema } from '../../schemas';

export const InstallAssetContractMaturity = 'SOURCE_EXAMPLE_BASELINE' as const;

export const InstallAssetRequestSchema = z.object({
  siteId: UuidSchema,
  areaId: UuidSchema,
  projectId: UuidSchema,
  technicianId: UuidSchema,
  installedAt: IsoDateTimeSchema,
  locationText: NonEmptyStringSchema,
});

export const InstallAssetDataSchema = z.object({
  id: UuidSchema,
  assetNo: NonEmptyStringSchema,
  status: AssetStatusSchema,
  qr: z.object({
    token: NonEmptyStringSchema,
  }),
});

export const InstallAssetResponseSchema = apiDataEnvelope(InstallAssetDataSchema);
