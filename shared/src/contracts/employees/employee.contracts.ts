import { z } from 'zod';
import { apiDataEnvelope, apiListEnvelope, DecimalStringSchema, IsoDateSchema, PageQuerySchema, UuidSchema } from '../common';

export const EmployeeContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_AND_FUNCTIONAL_SPEC' as const;

export const EmployeeListQuerySchema = PageQuerySchema.extend({
  branchId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
});

export const CreateEmployeeSchema = z.object({
  employeeNo: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  branchId: UuidSchema,
  departmentId: UuidSchema,
  userId: UuidSchema.nullable().optional(),
  managerId: UuidSchema.nullable().optional(),
  jobTitle: z.string().max(160).nullable().optional(),
  joiningDate: IsoDateSchema.nullable().optional(),
  employmentType: z.string().max(80).nullable().optional(),
  contact: z.record(z.string(), z.unknown()).nullable().optional(),
  emergencyContact: z.record(z.string(), z.unknown()).nullable().optional(),
  bankInformation: z.record(z.string(), z.unknown()).nullable().optional(),
  baseSalary: DecimalStringSchema.nullable().optional(),
  allowances: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.omit({ employeeNo: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one editable field is required',
);

export const EmployeeDataSchema = z.object({
  id: UuidSchema,
  employeeNo: z.string(), name: z.string(), branchId: UuidSchema, departmentId: UuidSchema,
  userId: UuidSchema.nullable(), managerId: UuidSchema.nullable(), jobTitle: z.string().nullable(),
  joiningDate: IsoDateSchema.nullable(), employmentType: z.string().nullable(), status: z.string(),
  baseSalary: DecimalStringSchema.nullable().optional(),
});
export const EmployeeResponseSchema = apiDataEnvelope(EmployeeDataSchema);
export const EmployeeListResponseSchema = apiListEnvelope(EmployeeDataSchema);
