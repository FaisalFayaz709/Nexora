import { createHash } from 'node:crypto';
import { AppError } from '../../core/http/errors.js';
import { Pass17DocumentEventCommunicationInvariants } from '@nexora/shared';

export const PASS_17_INTEGRATION_WEBHOOK_POLICY = 'PASS_17_INTEGRATION_WEBHOOK_POLICY' as const;

const CRITICAL_ASYNC_MUTATION_KEYS = [
  'stockBalance',
  'stockTransaction',
  'journalEntry',
  'paymentPosting',
  'approvalState',
  'invoiceBalance',
  'postedLedger',
] as const;

export function hashWebhookTargetUrl(targetUrl: string): string {
  return createHash('sha256').update(targetUrl.trim()).digest('hex');
}

export function assertWebhookEndpointConfiguration(input: {
  organizationId: string;
  connectionOrganizationId?: string | null;
  targetUrl?: string | null;
  eventType: string;
}) {
  if (!input.organizationId) {
    throw new AppError(500, 'WEBHOOK_TENANT_REQUIRED', 'Webhook configuration requires tenant context.');
  }
  if (input.connectionOrganizationId && input.connectionOrganizationId !== input.organizationId) {
    throw new AppError(403, 'WEBHOOK_CONNECTION_TENANT_MISMATCH', 'Webhook connection belongs to another tenant.');
  }
  if (!input.eventType || input.eventType.length < 3) {
    throw new AppError(400, 'WEBHOOK_EVENT_TYPE_REQUIRED', 'Webhook event type is required.');
  }
  if (input.targetUrl) {
    let parsed: URL;
    try {
      parsed = new URL(input.targetUrl);
    } catch {
      throw new AppError(400, 'WEBHOOK_TARGET_URL_INVALID', 'Webhook target URL is invalid.');
    }
    if (parsed.protocol !== 'https:') {
      throw new AppError(400, 'WEBHOOK_TARGET_HTTPS_REQUIRED', 'Webhook target URL must use HTTPS.');
    }
    if (parsed.username || parsed.password) {
      throw new AppError(400, 'WEBHOOK_TARGET_CREDENTIALS_FORBIDDEN', 'Webhook target URL must not contain embedded credentials.');
    }
  }
}

export function assertWebhookDeliveryPayloadSafe(payloadJson: Record<string, unknown>) {
  for (const key of CRITICAL_ASYNC_MUTATION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payloadJson, key)) {
      throw new AppError(500, 'WEBHOOK_CRITICAL_MUTATION_PAYLOAD_FORBIDDEN', 'Webhook delivery payload cannot carry critical stock, money, approval or ledger mutation state.', { key });
    }
  }
}

export function assertPass17DocumentEventCommunicationMatrix() {
  if (Pass17DocumentEventCommunicationInvariants.length < 12) {
    throw new AppError(500, 'PASS_17_INVARIANT_MATRIX_INCOMPLETE', 'Pass 17 document/event/communication invariant matrix is incomplete.');
  }
  return {
    policy: PASS_17_INTEGRATION_WEBHOOK_POLICY,
    invariants: Pass17DocumentEventCommunicationInvariants.length,
    criticalAsyncMutationKeys: CRITICAL_ASYNC_MUTATION_KEYS.length,
  };
}
