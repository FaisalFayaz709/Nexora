import { z } from 'zod';
import { DecimalStringSchema, IsoDateSchema, PageQuerySchema, UuidSchema } from '../common';

export const CrmContractMaturity = 'CORE_CRM_AND_EXTERNAL_PORTAL_PASS_18' as const;

export const LeadStatusSchema = z.enum(['NEW','CONTACTED','QUALIFIED','DISQUALIFIED','CONVERTED']);
export const OpportunityStatusSchema = z.enum(['OPEN','WON','LOST','ON_HOLD']);
export const SiteSurveyStatusSchema = z.enum(['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED']);
export const QuotationStatusSchema = z.enum(['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED']);
export const CustomerContractStatusSchema = z.enum(['DRAFT','ACTIVE','SUSPENDED','EXPIRED','TERMINATED']);

export const CrmListQuerySchema = PageQuerySchema.extend({
  status: z.string().optional(),
  customerId: UuidSchema.optional(),
  siteId: UuidSchema.optional(),
});

export const CreateLeadSchema = z.object({
  source: z.string().max(120).optional(),
  companyName: z.string().min(1).max(240),
  contactName: z.string().min(1).max(160),
  phone: z.string().max(60).optional(),
  email: z.string().email().optional(),
  requirement: z.string().max(4000).optional(),
  estimatedValue: DecimalStringSchema.optional(),
  expectedCloseDate: IsoDateSchema.optional(),
});
export const UpdateLeadSchema = CreateLeadSchema.partial().extend({ status: LeadStatusSchema.optional() });
export const QualifyLeadSchema = z.object({
  opportunityName: z.string().min(1).max(240),
  customerId: UuidSchema.optional(),
  estimatedValue: DecimalStringSchema.optional(),
  expectedCloseDate: IsoDateSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const CreateOpportunitySchema = z.object({
  leadId: UuidSchema.optional(),
  customerId: UuidSchema.optional(),
  name: z.string().min(1).max(240),
  stage: z.string().min(1).max(80).default('NEW'),
  probabilityPct: z.number().int().min(0).max(100).default(10),
  estimatedValue: DecimalStringSchema.default('0'),
  expectedCloseDate: IsoDateSchema.optional(),
});
export const UpdateOpportunitySchema = CreateOpportunitySchema.partial().extend({ status: OpportunityStatusSchema.optional() });

export const CreateSiteSurveySchema = z.object({
  opportunityId: UuidSchema.optional(),
  customerId: UuidSchema,
  siteId: UuidSchema,
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  findings: z.string().max(8000).optional(),
  estimatedEffortHours: DecimalStringSchema.optional(),
});
export const UpdateSiteSurveySchema = CreateSiteSurveySchema.partial().extend({ status: SiteSurveyStatusSchema.optional() });

export const QuotationItemSchema = z.object({
  productId: UuidSchema.optional(),
  description: z.string().min(1).max(500),
  quantity: DecimalStringSchema.default('1'),
  unitPrice: DecimalStringSchema,
  taxCodeId: UuidSchema.optional(),
});
export const CreateQuotationSchema = z.object({
  opportunityId: UuidSchema.optional(),
  customerId: UuidSchema,
  siteId: UuidSchema.optional(),
  validUntil: IsoDateSchema,
  currency: z.string().min(3).max(12).default('PKR'),
  terms: z.string().max(4000).optional(),
  items: z.array(QuotationItemSchema).min(1),
});
export const UpdateQuotationSchema = CreateQuotationSchema.partial().extend({ status: QuotationStatusSchema.optional() });
export const SendQuotationSchema = z.object({ message: z.string().max(2000).optional() });
export const AcceptQuotationSchema = z.object({
  acceptedByName: z.string().min(1).max(160),
  acceptedAt: z.string().datetime({ offset: true }).optional(),
  createContract: z.boolean().default(true),
});

export const CreateCustomerContractSchema = z.object({
  customerId: UuidSchema,
  siteId: UuidSchema.optional(),
  quotationId: UuidSchema.optional(),
  title: z.string().min(1).max(240),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema.optional(),
  billingCycle: z.enum(['ONE_TIME','MONTHLY','QUARTERLY','YEARLY']).default('MONTHLY'),
  amount: DecimalStringSchema.default('0'),
  terms: z.string().max(8000).optional(),
});
export const UpdateCustomerContractSchema = CreateCustomerContractSchema.partial().extend({ status: CustomerContractStatusSchema.optional() });
export const ActivateCustomerContractSchema = z.object({ activationNote: z.string().max(2000).optional() });
