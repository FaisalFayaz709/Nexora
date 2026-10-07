# NEXORA ERP — Locked Domain Event Catalog

| Event | Owner | Typical consumers |
|---|---|---|
| `identity.user.created` | Identity | Notification/audit |
| `identity.session.revoked` | Identity | Security notification |
| `purchase_request.submitted` | Procurement | Approval workflow |
| `purchase_request.approved` | Procurement | RFQ eligibility/notification |
| `purchase_order.approved` | Procurement | Vendor notification/webhook |
| `goods_receipt.received` | Procurement | Notifications/reporting |
| `stock.low` | Inventory | Replenishment notification |
| `stock.transfer.received` | Inventory | Project/warehouse notification |
| `project.created` | Projects | Notification/webhook |
| `project.handed_over` | Projects | Invoice/service eligibility |
| `asset.installed` | Assets | QR/document/customer notification |
| `asset.warranty.expiring` | Assets | Notification |
| `ticket.created` | Service | Assignment/SLA |
| `work_order.assigned` | Service | Technician notification |
| `work_order.completed` | Service | Customer notification/report PDF |
| `maintenance.due` | Maintenance | Work-order generation/notification |
| `invoice.approved` | Finance | PDF generation |
| `invoice.posted` | Finance | Email/webhook/AR update |
| `payment.posted` | Finance | Receipt/webhook |
| `contract.expiring` | CRM | Account-manager/customer notification |
| `document.expiring` | Documents | Owner notification |

Events are for integrations and non-critical side effects. They do not replace atomic stock, money or approval transactions.
| `document.upload.completed` | Documents | Document scan/notification/audit |
| `document.version.added` | Documents | Document scan/version notification |
| `communication.send.requested` | Communications | Email/SMS delivery worker |
| `integration.webhook.configured` | Integrations | Audit/reporting |
| `webhook.delivery.requested` | Integrations | Webhook delivery worker |
