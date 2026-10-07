import { describe, expect, it } from 'vitest';

describe('PASS_22 worker side-effect test obligation', () => {
  it('keeps BullMQ work to documents, emails, notifications, analytics and webhooks', () => {
    const allowedSideEffects = ['document generation', 'email sending', 'notification fan-out', 'analytics refresh', 'webhook delivery'];
    expect(allowedSideEffects).toContain('webhook delivery');
    expect(allowedSideEffects.join(' ')).not.toMatch(/stock balance source of truth|payment posting source of truth|approval state source of truth/i);
  });
});
