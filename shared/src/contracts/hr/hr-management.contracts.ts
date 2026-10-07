import { z } from 'zod';
import { DecimalStringSchema, IsoDateSchema, PageQuerySchema, UuidSchema } from '../common';

export const HrContractMaturity = 'CORE_9_IMPLEMENTED_WITH_ENTITY_CATALOG_PAYLOADS' as const;

export const AttendanceStatusSchema = z.enum([
  'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'REMOTE', 'ON_SITE', 'LEAVE', 'HOLIDAY',
]);
export const AttendanceMethodSchema = z.enum(['MANUAL', 'CHECK_IN_OUT', 'QR', 'MOBILE', 'IMPORT']);

export const AttendanceListQuerySchema = PageQuerySchema.extend({
  employeeId: UuidSchema.optional(),
  branchId: UuidSchema.optional(),
  status: AttendanceStatusSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export const LeaveStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
export const LeaveListQuerySchema = PageQuerySchema.extend({
  employeeId: UuidSchema.optional(),
  leaveTypeId: UuidSchema.optional(),
  status: LeaveStatusSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export const CreateLeaveRequestSchema = z.object({
  employeeId: UuidSchema,
  leaveTypeId: UuidSchema,
  fromDate: IsoDateSchema,
  toDate: IsoDateSchema,
  reason: z.string().max(2000).nullable().optional(),
}).refine((value) => new Date(value.toDate).getTime() >= new Date(value.fromDate).getTime(), {
  message: 'Leave toDate cannot precede fromDate.',
});

export const LeaveCommandSchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
});

export const PayrollStatusSchema = z.enum(['DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'CANCELLED']);
export const PayrollRunListQuerySchema = PageQuerySchema.extend({
  branchId: UuidSchema.optional(),
  status: PayrollStatusSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export const CreatePayrollRunSchema = z.object({
  branchId: UuidSchema.nullable().optional(),
  periodStart: IsoDateSchema,
  periodEnd: IsoDateSchema,
  employeeIds: z.array(UuidSchema).optional(),
}).refine((value) => new Date(value.periodEnd).getTime() >= new Date(value.periodStart).getTime(), {
  message: 'Payroll periodEnd cannot precede periodStart.',
});

export const PayrollCalculateSchema = z.object({
  recalculate: z.boolean().default(false),
});

export const PayrollApproveSchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
});

export const PayrollPostSchema = z.object({
  postingDate: IsoDateSchema.optional(),
});
