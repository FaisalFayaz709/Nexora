export const QUEUE_NAMES = {
  documentGenerateInvoice: 'document.generate.invoice',
  emailSend: 'email.send',
  notificationCreate: 'notification.create',
  maintenanceScan: 'maintenance.scan',
  contractExpiryScan: 'contract.expiry.scan',
  invoiceOverdueScan: 'invoice.overdue.scan',
  reportExport: 'report.export',
  webhookDeliver: 'webhook.deliver',
  documentScan: 'document.scan',
} as const;

export type QueueNameKey = keyof typeof QUEUE_NAMES;
export type QueueName = (typeof QUEUE_NAMES)[QueueNameKey];
export const QUEUE_NAME_VALUES = Object.values(QUEUE_NAMES);
