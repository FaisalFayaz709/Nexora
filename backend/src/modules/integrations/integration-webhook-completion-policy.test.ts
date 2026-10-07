import { describe, expect, it } from 'vitest';
import { assertPass17DocumentEventCommunicationMatrix, assertWebhookDeliveryPayloadSafe, assertWebhookEndpointConfiguration, hashWebhookTargetUrl } from './integration-webhook-policy.js';

describe('Pass 17 integration webhook completion policy', () => {
  it('keeps webhook configuration tenant scoped and HTTPS only', () => {
    expect(() => assertWebhookEndpointConfiguration({ organizationId: 'org', connectionOrganizationId: 'org', targetUrl: 'https://example.com/hook', eventType: 'invoice.posted' })).not.toThrow();
    expect(() => assertWebhookEndpointConfiguration({ organizationId: 'org', connectionOrganizationId: 'other', targetUrl: 'https://example.com/hook', eventType: 'invoice.posted' })).toThrow();
    expect(() => assertWebhookEndpointConfiguration({ organizationId: 'org', connectionOrganizationId: 'org', targetUrl: 'http://example.com/hook', eventType: 'invoice.posted' })).toThrow();
  });

  it('never permits critical stock money approval payloads inside webhook jobs', () => {
    expect(() => assertWebhookDeliveryPayloadSafe({ invoiceId: 'inv', status: 'POSTED' })).not.toThrow();
    expect(() => assertWebhookDeliveryPayloadSafe({ paymentPosting: { amount: 100 } })).toThrow();
  });

  it('does not retain raw target url in webhook identity', () => {
    expect(hashWebhookTargetUrl('https://example.com/hook')).toHaveLength(64);
    expect(assertPass17DocumentEventCommunicationMatrix().invariants).toBeGreaterThanOrEqual(12);
  });
});
