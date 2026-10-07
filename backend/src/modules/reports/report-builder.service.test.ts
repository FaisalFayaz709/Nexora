import { describe, expect, it } from 'vitest';
import { ReportTemplateCreateSchema, SavedReportCreateSchema, ScheduledReportCreateSchema } from '@nexora/shared';

describe('Report Builder contracts', () => {
  it('requires selected fields and permission scope on templates', () => {
    const value = ReportTemplateCreateSchema.parse({
      name: 'AR Aging by Customer',
      dataSource: 'FINANCE_AR',
      selectedFields: ['customerName','invoiceNo','balance'],
      permissionScope: ['finance.view'],
    });
    expect(value.dataSource).toBe('FINANCE_AR');
  });

  it('stores saved report filters and scope', () => {
    const value = SavedReportCreateSchema.parse({
      templateId: '11111111-1111-4111-8111-111111111111',
      name: 'Open Critical Tickets',
      selectedFields: ['ticketNo','priority','status'],
      filterJson: { priority: 'CRITICAL' },
      permissionScope: ['ticket.view'],
    });
    expect(value.filterJson).toEqual({ priority: 'CRITICAL' });
  });

  it('validates scheduled report recipients', () => {
    const value = ScheduledReportCreateSchema.parse({
      savedReportId: '11111111-1111-4111-8111-111111111111',
      frequency: 'DAILY',
      timezone: 'Asia/Karachi',
      nextRunAt: '2026-09-06T08:00:00+05:00',
      recipients: ['manager@example.com'],
    });
    expect(value.frequency).toBe('DAILY');
  });
});
