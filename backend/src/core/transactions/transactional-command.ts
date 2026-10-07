import type { TransactionClient } from '@nexora/database';
import { AuditWriter, type AuditEntry } from '../audit/audit-writer.js';
import { BusinessEventWriter, type BusinessEventEntry } from '../events/business-event-writer.js';

export interface TransactionalCommandEffects<TResult> {
  readonly audit?: AuditEntry | readonly AuditEntry[];
  readonly events?: BusinessEventEntry | readonly BusinessEventEntry[];
  readonly result: TResult;
}

const auditWriter = new AuditWriter();
const eventWriter = new BusinessEventWriter();

/**
 * Helper for services that need to persist a business result and the matching
 * audit/event records inside the same PostgreSQL transaction. This helper does
 * not create a transaction by itself; the domain service remains responsible
 * for choosing the correct transaction boundary.
 */
export async function persistTransactionalCommandEffects<TResult>(
  tx: TransactionClient,
  effects: TransactionalCommandEffects<TResult>,
): Promise<TResult> {
  const audits = effects.audit ? (Array.isArray(effects.audit) ? effects.audit : [effects.audit]) : [];
  const events = effects.events ? (Array.isArray(effects.events) ? effects.events : [effects.events]) : [];

  for (const entry of audits) await auditWriter.append(tx, entry);
  for (const event of events) await eventWriter.append(tx, event);

  return effects.result;
}
