import { z } from 'zod';
import { DecimalStringSchema, PageQuerySchema, UuidSchema } from '../common';
import { TicketStatusSchema, WorkOrderStatusSchema } from '../../schemas/status-models';

export const FieldServiceContractMaturity =
  'SOURCE_CREATE_TICKET_AND_COMPLETE_WORK_ORDER_EXAMPLES_PLUS_IMPLEMENTATION_DERIVED_LOCKED_ROUTE_CONTRACTS' as const;

export const TicketCategorySchema = z.enum([
  'TECHNICAL_ISSUE','INSTALLATION_ISSUE','MAINTENANCE_REQUEST','WARRANTY_CLAIM',
  'BILLING_ISSUE','NETWORK_PROBLEM','EQUIPMENT_FAILURE','GENERAL_REQUEST',
]);
export const TicketPrioritySchema = z.enum(['LOW','MEDIUM','HIGH','CRITICAL']);
export const TechnicianAvailabilitySchema = z.enum(['AVAILABLE','ASSIGNED','ON_SITE','ON_LEAVE','OFF_DUTY']);

export const TicketListQuerySchema = PageQuerySchema.extend({
  status: TicketStatusSchema.optional(), priority: TicketPrioritySchema.optional(),
  customerId: UuidSchema.optional(), siteId: UuidSchema.optional(), assetId: UuidSchema.optional(),
  assignedToId: UuidSchema.optional(),
});
export const TicketControlledPatchStatusSchema = z.enum(['IN_PROGRESS','WAITING_CUSTOMER','WAITING_VENDOR','CANCELLED']);
export const UpdateTicketSchema = z.object({
  category: TicketCategorySchema.optional(), priority: TicketPrioritySchema.optional(),
  subject: z.string().min(1).max(240).optional(), description: z.string().min(1).max(8000).optional(),
  status: TicketControlledPatchStatusSchema.optional(),
}).refine(v => Object.keys(v).length > 0, 'At least one editable ticket field is required.');
export const AssignTicketSchema = z.object({ assigneeId: UuidSchema });
export const ResolveTicketSchema = z.object({ resolution: z.string().min(1).max(4000) });
export const CloseTicketSchema = z.object({ customerConfirmed: z.literal(true), comment: z.string().max(2000).optional() });

export const WorkOrderListQuerySchema = PageQuerySchema.extend({
  status: WorkOrderStatusSchema.optional(), priority: TicketPrioritySchema.optional(),
  ticketId: UuidSchema.optional(), assetId: UuidSchema.optional(), projectId: UuidSchema.optional(),
  technicianId: UuidSchema.optional(),
});
export const CreateWorkOrderSchema = z.object({
  ticketId: UuidSchema, scheduledAt: z.string().datetime().nullable().optional(), priority: TicketPrioritySchema.optional(),
});
export const UpdateWorkOrderSchema = z.object({
  scheduledAt: z.string().datetime().nullable().optional(), priority: TicketPrioritySchema.optional(),
  status: z.enum(['WAITING_FOR_PART','CANCELLED']).optional(),
}).refine(v => Object.keys(v).length > 0, 'At least one editable work-order field is required.');
export const AssignWorkOrderSchema = z.object({ technicianId: UuidSchema, scheduledAt: z.string().datetime().nullable().optional() });
export const WorkOrderCommandNoteSchema = z.object({ note: z.string().max(2000).optional() });

export const ServiceReportBatchInputSchema = z.object({ lotNo: z.string().min(1).max(120), qty: DecimalStringSchema });
export const ServiceReportPartInputSchema = z.object({
  productId: UuidSchema, qty: DecimalStringSchema, sourceWarehouseId: UuidSchema,
  sourceLocationId: UuidSchema.nullable().optional(), batches: z.array(ServiceReportBatchInputSchema).default([]),
});
export const CreateServiceReportSchema = z.object({
  arrivalAt: z.string().datetime(), departureAt: z.string().datetime(), workPerformed: z.string().min(1).max(8000),
  rootCause: z.string().min(1).max(4000), resolution: z.string().min(1).max(8000),
  beforePhotoDocumentId: UuidSchema.nullable().optional(), afterPhotoDocumentId: UuidSchema.nullable().optional(),
  customerSignDocumentId: UuidSchema.nullable().optional(), technicianSignDocumentId: UuidSchema.nullable().optional(),
  parts: z.array(ServiceReportPartInputSchema).default([]),
}).refine(v => new Date(v.departureAt).getTime() >= new Date(v.arrivalAt).getTime(), 'Service report departure time cannot precede arrival time.');

const OptionalLocationProofSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().min(0).max(100000).optional(), capturedAt: z.string().datetime().optional(),
  photoDocumentId: UuidSchema.nullable().optional(),
}).superRefine((v,ctx)=>{ if ((v.latitude!==undefined)!==(v.longitude!==undefined)) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Latitude and longitude must be supplied together.'}); });
export const TechnicianCheckInSchema = OptionalLocationProofSchema;
export const TechnicianLocationSchema = z.object({ latitude:z.number().min(-90).max(90), longitude:z.number().min(-180).max(180), accuracyMeters:z.number().min(0).max(100000).optional(), capturedAt:z.string().datetime().optional() });
export const TechnicianCheckOutSchema = OptionalLocationProofSchema.extend({ customerSignDocumentId: UuidSchema.nullable().optional() });
