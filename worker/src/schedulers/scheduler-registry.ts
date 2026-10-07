import type { Queue } from 'bullmq';
import { QUEUE_NAMES, type QueueName } from '../queues/queue-names.js';

function isoNow(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function registerScheduledJobs(queues: Map<QueueName, Queue>): Promise<void> {
  const maintenance = queues.get(QUEUE_NAMES.maintenanceScan);
  const contracts = queues.get(QUEUE_NAMES.contractExpiryScan);
  const invoices = queues.get(QUEUE_NAMES.invoiceOverdueScan);

  if (!maintenance || !contracts || !invoices) {
    throw new Error('Cannot register scheduled jobs because one or more required queues are missing.');
  }

  await maintenance.add(
    'maintenance.scan.hourly',
    {
      scope: 'all-tenants',
      dueBefore: addDays(7),
      idempotencyKey: `maintenance.scan:${new Date().toISOString().slice(0, 13)}`,
      requestedAt: isoNow(),
    },
    {
      jobId: 'maintenance.scan.hourly',
      repeat: { pattern: '0 * * * *' },
    },
  );

  await contracts.add(
    'contract.expiry.scan.daily',
    {
      scope: 'all-tenants',
      expiresBefore: addDays(30),
      idempotencyKey: `contract.expiry.scan:${new Date().toISOString().slice(0, 10)}`,
      requestedAt: isoNow(),
    },
    {
      jobId: 'contract.expiry.scan.daily',
      repeat: { pattern: '15 6 * * *' },
    },
  );

  await invoices.add(
    'invoice.overdue.scan.daily',
    {
      scope: 'all-tenants',
      asOf: isoNow(),
      idempotencyKey: `invoice.overdue.scan:${new Date().toISOString().slice(0, 10)}`,
      requestedAt: isoNow(),
    },
    {
      jobId: 'invoice.overdue.scan.daily',
      repeat: { pattern: '30 1 * * *' },
    },
  );
}
