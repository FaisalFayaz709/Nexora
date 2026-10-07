import { z } from 'zod';
import { UuidSchema } from '../common';

export const ReportExportJobSchema = z.object({
  organizationId: UuidSchema,
  requestedByUserId: UuidSchema,
  reportKey: z.string().min(1).max(160),
  format: z.enum(['CSV', 'XLSX', 'PDF']),
  parameters: z.record(z.string(), z.unknown()).default({}),
});
export type ReportExportJob = z.infer<typeof ReportExportJobSchema>;
export const REPORT_EXPORT_JOB = 'report.export' as const;
