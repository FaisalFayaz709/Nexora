import { z } from 'zod';
import { apiDataEnvelope, UuidSchema } from '../common';

export const VendorOnboardingContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_APPENDIX_F_VENDOR_ONBOARDING_AND_RISK_LOCKED_ROUTE_SEMANTICS' as const;

export const VendorRiskRatingSchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'BLACKLISTED',
]);

export const VendorOnboardingDecisionSchema = z.enum([
  'APPROVE',
  'BLACKLIST',
]);

export const CreateVendorOnboardingRequestSchema = z.object({
  vendorId: UuidSchema,
  documentEvidence: z.array(z.object({
    documentType: z.string().min(1).max(120),
    documentId: UuidSchema.optional(),
    verified: z.boolean().default(false),
    note: z.string().max(1000).optional(),
  })).default([]),
  bankEvidence: z.object({
    verified: z.boolean().default(false),
    bankName: z.string().max(160).optional(),
    accountNoMasked: z.string().max(80).optional(),
    note: z.string().max(1000).optional(),
  }).optional(),
  categoryIds: z.array(UuidSchema).default([]),
});

export const VendorOnboardingActionSchema = z.object({
  decision: VendorOnboardingDecisionSchema.default('APPROVE'),
  comment: z.string().max(1000).nullable().optional(),
  documentsVerified: z.boolean().default(false),
  bankVerified: z.boolean().default(false),
  riskScore: z.number().int().min(0).max(100).default(0),
  riskRating: VendorRiskRatingSchema.default('LOW'),
  approvedCategoryIds: z.array(UuidSchema).default([]),
  blacklistReason: z.string().max(1000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.decision === 'APPROVE') {
    if (!value.documentsVerified) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vendor documents must be verified before approval.' });
    }
    if (!value.bankVerified) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vendor bank details must be verified before approval.' });
    }
    if (value.riskRating === 'HIGH' || value.riskRating === 'BLACKLISTED') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'High-risk or blacklisted vendors cannot be approved.' });
    }
  }
  if (value.decision === 'BLACKLIST' && !value.blacklistReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blacklistReason is required when blacklisting a vendor.' });
  }
});

export const VendorOnboardingDataSchema = z.object({
  id: UuidSchema,
  vendorId: UuidSchema,
  status: z.string(),
  approvalRequestId: UuidSchema.nullable(),
  riskScore: z.number().int().nullable().optional(),
  riskRating: z.string().nullable().optional(),
});

export const VendorOnboardingResponseSchema = apiDataEnvelope(VendorOnboardingDataSchema);
