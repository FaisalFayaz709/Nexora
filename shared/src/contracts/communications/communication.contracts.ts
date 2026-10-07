import { z } from 'zod';
import { IsoDateTimeSchema, PageQuerySchema, UuidSchema } from '../common';

export const CommunicationContractMaturity =
  'APPENDIX_F_3_ENDPOINTS_WITH_IMPLEMENTATION_DERIVED_PAYLOADS' as const;

export const CommunicationChannelSchema = z.enum([
  'EMAIL',
  'SMS',
  'PORTAL',
  'IN_APP',
  'MANUAL',
]);

export const CommunicationDirectionSchema = z.enum(['OUTBOUND', 'INBOUND']);
export const CommunicationDeliveryStatusSchema = z.enum([
  'DRAFT',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]);

export const CommunicationSubjectTypeSchema = z.enum([
  'Customer',
  'Vendor',
  'Ticket',
  'WorkOrder',
  'Project',
  'CustomerInvoice',
  'SupplierInvoice',
  'PurchaseOrder',
  'Asset',
  'Manual',
]);

export const CommunicationListQuerySchema = PageQuerySchema.extend({
  subjectType: CommunicationSubjectTypeSchema.optional(),
  subjectId: UuidSchema.optional(),
  channel: CommunicationChannelSchema.optional(),
  status: CommunicationDeliveryStatusSchema.optional(),
  recipient: z.string().max(320).optional(),
});

export const CommunicationAttachmentInputSchema = z.object({
  documentId: UuidSchema,
  fileName: z.string().min(1).max(240).optional(),
});

export const SendCommunicationSchema = z.object({
  subjectType: CommunicationSubjectTypeSchema.default('Manual'),
  subjectId: UuidSchema.optional(),
  channel: CommunicationChannelSchema,
  direction: CommunicationDirectionSchema.default('OUTBOUND'),
  templateKey: z.string().min(1).max(160).optional(),
  recipientName: z.string().max(240).optional(),
  recipient: z.string().min(1).max(320),
  subject: z.string().max(240).optional(),
  body: z.string().min(1).max(12000),
  scheduledAt: IsoDateTimeSchema.optional(),
  attachments: z.array(CommunicationAttachmentInputSchema).default([]),
}).superRefine((value, ctx) => {
  if (value.channel === 'EMAIL' && !value.subject) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email communications require a subject.' });
  }
  if (value.channel === 'SMS' && value.body.length > 1600) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMS body cannot exceed 1600 characters.' });
  }
});
