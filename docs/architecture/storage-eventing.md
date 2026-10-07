# NEXORA ERP — Storage, Redis, BullMQ & Eventing Freeze

## MinIO boundary

Business modules **never call the MinIO SDK directly**. They call a backend `StorageService`.

Private object pattern:

```text
nexora-private/
└── organizations/{organizationId}/
    ├── employees/{employeeId}/...
    ├── customers/{customerId}/...
    ├── vendors/{vendorId}/...
    ├── projects/{projectId}/...
    ├── assets/{assetId}/...
    ├── work-orders/{workOrderId}/...
    └── finance/{invoiceId}/...
```

`nexora-public` is only for intentionally public brand/static resources.

## File flows

- Small upload: Browser → Fastify multipart → validation → StorageService → MinIO → Document metadata transaction.
- Large upload: upload-intent → authorized short-lived presigned PUT → upload → complete-upload verification → Document record.
- Download: Browser → API authorization → short-lived presigned GET.
- New version: append DocumentVersion; retain previous version per policy.
- Delete: retention check → metadata state change → object deletion/retention job where allowed.

## Locked BullMQ jobs

| Job | Action | Retry / idempotency |
|---|---|---|
| `document.generate.invoice` | Generate PDF, store/link Document | invoice-version idempotency |
| `email.send` | Render/send email | capped exponential backoff |
| `notification.create` | Create/fan-out notification | deduplicate event + recipient |
| `maintenance.scan` | Find due schedules; generate WO jobs | unique schedule occurrence |
| `contract.expiry.scan` | Expiry notifications | date + contract dedupe |
| `invoice.overdue.scan` | Mark eligible invoices overdue | transactional status guard |
| `report.export` | Generate CSV/XLSX/PDF | job id + parameter hash |
| `webhook.deliver` | Sign + POST payload | delivery record + retry |
| `document.scan` | Optional malware/validation pipeline | object checksum key |

**Never move stock, money, approval state or same-transaction accounting effects into queues.**
