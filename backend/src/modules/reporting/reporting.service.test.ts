import { describe, expect, it } from 'vitest';
import { ReportListQuerySchema, RequestReportExportSchema } from '@nexora/shared';
describe('Reporting runtime contracts',()=>{
  it('validates report list filter',()=>{expect(ReportListQuerySchema.parse({owner:'me'}).owner).toBe('me');});
  it('validates report export request',()=>{const v=RequestReportExportSchema.parse({reportId:'11111111-1111-4111-8111-111111111111'}); expect(v.format).toBe('CSV');});
});
