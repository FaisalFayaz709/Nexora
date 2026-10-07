# NEXORA ERP — Source-Provided API Contract Examples

These are the concrete examples explicitly provided by the specification. They are preserved as the baseline freeze baseline.

## Create customer shared contract example

```ts
export const CreateCustomerSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(200),
  taxNo: z.string().max(80).optional(),
  primaryContact: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional()
  }).optional()
});
```

## Login

`POST /auth/login`

```json
{
  "email": "manager@example.com",
  "password": "********"
}
```

Response:
```json
{
  "data": {
    "accessToken": "short-lived-token",
    "requiresMfa": false,
    "user": { "id": "uuid", "name": "Ahmed", "memberships": [] }
  }
}
```

## Create purchase request

`POST /purchase-requests`

```json
{
  "projectId": "uuid",
  "requiredDate": "2026-09-20",
  "reason": "Project material shortage",
  "items": [
    { "productId": "uuid", "quantity": "35", "estimatedUnitPrice": "18500.00" }
  ]
}
```

Expected response shape:
```json
{
  "data": {
    "id": "uuid",
    "prNo": "PR-2026-0031",
    "status": "DRAFT",
    "items": []
  }
}
```

## Approve purchase request

`POST /purchase-requests/:id/approve`

```json
{ "comment": "Budget verified and material is required." }
```

Expected response shape:
```json
{
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "approval": { "currentStep": null, "completed": true }
  }
}
```

## Receive goods

`POST /goods-receipts`

```json
{
  "purchaseOrderId": "uuid",
  "warehouseId": "uuid",
  "receivedAt": "2026-09-18T09:30:00Z",
  "items": [
    {
      "purchaseOrderItemId": "uuid",
      "receivedQty": "10",
      "acceptedQty": "9",
      "damagedQty": "1",
      "serialNumbers": ["SN1001", "SN1002"]
    }
  ]
}
```

## Stock transfer

`POST /inventory/transfers`

```json
{
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "items": [{ "productId": "uuid", "quantity": "5" }]
}
```

## Create project

`POST /projects`

```json
{
  "customerId": "uuid",
  "contractId": "uuid",
  "siteId": "uuid",
  "name": "Campus CCTV Upgrade",
  "managerId": "uuid",
  "startDate": "2026-09-10",
  "dueDate": "2026-11-15",
  "contractValue": "5000000.00"
}
```

## Install asset

`POST /assets/:id/install`

```json
{
  "siteId": "uuid",
  "areaId": "uuid",
  "projectId": "uuid",
  "technicianId": "uuid",
  "installedAt": "2026-09-20T11:10:00Z",
  "locationText": "Building A - Floor 2 - Corridor"
}
```

## Create ticket

`POST /tickets`

```json
{
  "customerId": "uuid",
  "siteId": "uuid",
  "assetId": "uuid",
  "category": "EQUIPMENT_FAILURE",
  "priority": "HIGH",
  "subject": "Camera offline",
  "description": "Camera stopped responding this morning."
}
```

## Complete work order

`POST /work-orders/:id/complete`

```json
{
  "serviceReportId": "uuid",
  "customerConfirmed": true
}
```

## Create customer invoice

`POST /customer-invoices`

```json
{
  "customerId": "uuid",
  "projectId": "uuid",
  "issueDate": "2026-10-01",
  "dueDate": "2026-10-31",
  "items": [
    { "description": "Milestone 1", "quantity": "1", "unitPrice": "1500000.00", "taxRate": "0" }
  ]
}
```

## Record payment

`POST /payments`

```json
{
  "direction": "INBOUND",
  "partyType": "CUSTOMER",
  "partyId": "uuid",
  "amount": "500000.00",
  "method": "BANK_TRANSFER",
  "paidAt": "2026-10-10T10:00:00Z",
  "allocations": [{ "invoiceId": "uuid", "amount": "500000.00" }]
}
```

## Presigned file upload intent

`POST /documents/upload-intent`

```json
{
  "fileName": "site-photo.jpg",
  "mimeType": "image/jpeg",
  "size": 842113,
  "subjectType": "PROJECT",
  "subjectId": "uuid",
  "category": "SITE_PHOTO"
}
```

## Important contract note

The PDF explicitly states that exact payload fields live in shared contracts. It does not print a complete field-level schema for every endpoint. Therefore baseline freeze freezes every printed method/path/purpose/permission/response convention and every printed example, but does not fabricate omitted field-level contracts.
