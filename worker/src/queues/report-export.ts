import type { ReportExportJob } from '@nexora/shared';
import { REPORT_EXPORT_JOB } from '@nexora/shared';

/**
 * Phase-0 report export job contract. The later Reports/Documents pass supplies
 * the concrete CSV/XLSX/PDF renderer and StorageService implementation.
 * This job may generate/export documents only; it never mutates stock, money or approval state.
 */
export interface ReportExportProcessor {
  process(job: ReportExportJob): Promise<{ documentId: string }>;
}
export const REPORT_EXPORT_JOB_NAME = REPORT_EXPORT_JOB;
