import { z } from 'zod';

export const DOMAIN_EVENTS = [
  "identity.user.created",
  "identity.session.revoked",
  "purchase_request.submitted",
  "purchase_request.approved",
  "purchase_order.approved",
  "goods_receipt.received",
  "stock.low",
  "stock.transfer.received",
  "project.created",
  "project.handed_over",
  "asset.installed",
  "asset.warranty.expiring",
  "ticket.created",
  "work_order.assigned",
  "work_order.completed",
  "maintenance.due",
  "invoice.approved",
  "invoice.posted",
  "payment.posted",
  "contract.expiring",
  "document.expiring",
  "document.upload.completed",
  "document.version.added",
  "communication.send.requested",
  "integration.webhook.configured",
  "webhook.delivery.requested",
] as const;

export const DomainEventNameSchema = z.enum(DOMAIN_EVENTS);
export type DomainEventName = z.infer<typeof DomainEventNameSchema>;
