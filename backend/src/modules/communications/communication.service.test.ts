import { describe, expect, it } from 'vitest';
import { CommunicationChannelSchema, SendCommunicationSchema } from '@nexora/shared';

describe('Communication contracts', () => {
  it('accepts all source communication channels', () => {
    for (const channel of ['EMAIL','SMS','PORTAL','IN_APP','MANUAL']) {
      expect(CommunicationChannelSchema.parse(channel)).toBe(channel);
    }
  });

  it('requires email subject for email sends', () => {
    expect(() => SendCommunicationSchema.parse({ channel: 'EMAIL', recipient: 'a@example.com', body: 'Hello' })).toThrow();
  });

  it('accepts a customer timeline communication with document attachments', () => {
    const value = SendCommunicationSchema.parse({
      subjectType: 'Ticket',
      subjectId: '11111111-1111-4111-8111-111111111111',
      channel: 'EMAIL',
      recipient: 'customer@example.com',
      subject: 'Ticket update',
      body: 'Your ticket has been updated.',
      attachments: [{ documentId: '22222222-2222-4222-8222-222222222222', fileName: 'report.pdf' }],
    });
    expect(value.attachments).toHaveLength(1);
  });
});
