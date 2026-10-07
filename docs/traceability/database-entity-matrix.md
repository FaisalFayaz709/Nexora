# NEXORA ERP — Database Entity Matrix

**Captured entity entries:** 210

> Status is reconciled from actual Prisma model declarations in `database/prisma/schema.prisma`.
>
> `IMPLEMENTED_STATIC_ONLY` means the logical entity has a corresponding Prisma model. It does not certify migrations, seed data, indexes, runtime queries or transaction behavior.

## Identity & Access

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `User` | id, email, passwordHash, status, lastLoginAt | Global login identity | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Session` | id, userId, refreshTokenHash, device, ip, expiresAt, revokedAt | Revocable login session | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `MfaCredential` | id, userId, type, secretEncrypted, enabledAt | MFA enrollment | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Permission` | id, key, description | Canonical permission key | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Role` | id, organizationId, name, systemRole | Tenant role | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `RolePermission` | roleId, permissionId | Role-permission bridge | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `OrganizationMembership` | id, userId, organizationId, branchId, status | User participation in tenant | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `UserRole` | membershipId, roleId | Role assignment in tenant | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Organization

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Organization` | id, code, name, currency, timezone, locale, status | Tenant root | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Branch` | id, organizationId, code, name, addressId | Operating branch | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Department` | id, organizationId, branchId, name, managerEmployeeId | Functional department | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Team` | id, organizationId, departmentId, name | Optional team grouping | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Address` | id, organizationId, type, lines, city, region, country | Reusable address | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `OrganizationSetting` | id, organizationId, key, valueJson | Tenant configuration | Core §7 | IMPLEMENTED_STATIC_ONLY |

## HR

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Employee` | id, organizationId, userId, branchId, departmentId, employeeNo, managerId, status | Employee master | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `EmployeeSkill` | employeeId, skillId, proficiency | Employee skill mapping | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `EmployeeCertification` | id, employeeId, name, issuedAt, expiresAt, documentId | Certification history | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Attendance` | id, employeeId, workDate, checkIn, checkOut, status | Daily attendance | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `LeaveType` | id, organizationId, name, annualAllowance | Leave policy type | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `LeaveBalance` | id, employeeId, leaveTypeId, year, opening, used, remaining | Leave balance | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `LeaveRequest` | id, employeeId, leaveTypeId, fromDate, toDate, status, approvalRequestId | Leave workflow | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PayrollRun` | id, organizationId, periodStart, periodEnd, status | Payroll batch | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PayrollItem` | id, payrollRunId, employeeId, gross, deductions, net | Employee payroll result | Core §7 | IMPLEMENTED_STATIC_ONLY |

## CRM & Customer

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Lead` | id, organizationId, ownerId, source, name, status | Prospect lead | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Opportunity` | id, organizationId, customerId, leadId, ownerId, stage, estimatedValue | Sales opportunity | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SiteSurvey` | id, organizationId, opportunityId, customerSiteId, engineerId, status | Technical survey | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Quotation` | id, organizationId, opportunityId, customerId, quoteNo, status, validUntil, totals | Commercial quotation | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `QuotationItem` | id, quotationId, productId, description, qty, price, tax | Quotation line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SalesOrder` | id, organizationId, quotationId, customerId, orderNo, status, total | Accepted sale | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Contract` | id, organizationId, customerId, salesOrderId, contractNo, startDate, endDate, value, status | Customer contract | Core §7 | NOT_IMPLEMENTED |
| `ServicePackage` | id, organizationId, name, responseSla, resolutionSla, billingCycle | Service plan template | Core §7 | NOT_IMPLEMENTED |
| `Customer` | id, organizationId, code, name, taxNo, status, creditLimit | Customer master | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CustomerContact` | id, customerId, name, email, phone, isPrimary | Customer person | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CustomerSite` | id, organizationId, customerId, code, name, addressId | Service/project location | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SiteBuilding` | id, customerSiteId, name | Building grouping | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SiteArea` | id, buildingId, parentAreaId, name, areaType | Floor/room/zone hierarchy | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Vendors

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Vendor` | id, organizationId, code, name, taxNo, status, paymentTerms | Supplier master | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `VendorContact` | id, vendorId, name, email, phone, isPrimary | Supplier person | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `VendorProduct` | vendorId, productId, vendorSku, leadTimeDays, lastPrice | Approved vendor-product link | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `VendorPerformance` | id, vendorId, period, onTimePct, rejectPct, score | Periodic performance snapshot | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Product & Inventory

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `ProductCategory` | id, organizationId, parentId, name | Product taxonomy | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Product` | id, organizationId, categoryId, sku, name, unitId, trackingType, minStock, maxStock | Item/service master | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `UnitOfMeasure` | id, organizationId, code, name, precision | Quantity unit | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Warehouse` | id, organizationId, branchId, code, name, status | Stock location | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `WarehouseLocation` | id, warehouseId, parentId, type, code, name | Zone/rack/shelf/bin tree | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockBalance` | id, organizationId, warehouseId, locationId, productId, onHand, reserved | Materialized current balance | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockTransaction` | id, organizationId, productId, warehouseId, locationId, type, qty, referenceType, referenceId, occurredAt | Immutable stock ledger | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockReservation` | id, organizationId, productId, warehouseId, projectId, qty, status | Reserved inventory | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockTransfer` | id, organizationId, fromWarehouseId, toWarehouseId, transferNo, status | Warehouse movement header | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockTransferItem` | id, transferId, productId, qty, receivedQty | Transfer line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SerialNumber` | id, organizationId, productId, serialNo, status, currentWarehouseId, assetId | Individually tracked unit | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `BatchLot` | id, organizationId, productId, lotNo, manufactureDate, expiryDate, qtyRemaining | Lot-tracked stock | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `StockAdjustment` | id, organizationId, warehouseId, reason, status, approvalRequestId | Controlled correction | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Procurement

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `MaterialRequirement` | id, organizationId, projectId, requestedById, status | Project/department material need | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseRequest` | id, organizationId, branchId, projectId, prNo, requesterId, requiredDate, status, approvalRequestId | Internal purchase request | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseRequestItem` | id, purchaseRequestId, productId, description, qty, estimatedPrice | PR line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `RFQ` | id, organizationId, purchaseRequestId, rfqNo, closesAt, status | Supplier bidding request | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `RFQVendor` | rfqId, vendorId, invitedAt, responseStatus | RFQ invitation | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SupplierQuotation` | id, organizationId, rfqId, vendorId, quoteRef, validity, total, status | Vendor commercial response | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SupplierQuotationItem` | id, supplierQuotationId, productId, qty, unitPrice, deliveryDays, warrantyMonths | Vendor line quote | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseOrder` | id, organizationId, vendorId, supplierQuotationId, poNo, orderDate, expectedDate, status, total | Purchase commitment | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseOrderItem` | id, purchaseOrderId, productId, orderedQty, receivedQty, unitPrice, tax | PO line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `GoodsReceipt` | id, organizationId, purchaseOrderId, warehouseId, grnNo, receivedAt, receivedById, status | Goods receiving header | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `GoodsReceiptItem` | id, goodsReceiptId, poItemId, productId, receivedQty, acceptedQty, damagedQty | Received line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `QualityInspection` | id, organizationId, goodsReceiptId, inspectorId, result, notes | Receiving quality check | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Projects

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Project` | id, organizationId, customerId, contractId, siteId, projectNo, managerId, status, startDate, dueDate, contractValue | Project aggregate root | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectPhase` | id, projectId, name, sequence, status | Project phase | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectTask` | id, projectId, phaseId, assigneeId, title, status, priority, startDate, dueDate, completionPct | Work item | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectTaskDependency` | taskId, dependsOnTaskId, type | Task dependency | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectMilestone` | id, projectId, name, dueDate, achievedAt, status | Milestone | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectMember` | projectId, employeeId, role, allocationPct | Project team | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `BillOfMaterials` | id, projectId, version, status | Project BOM header | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `BOMItem` | id, billOfMaterialsId, productId, requiredQty, reservedQty, issuedQty | Material plan line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectBudget` | id, projectId, version, status, totalBudget | Budget header | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectBudgetLine` | id, projectBudgetId, category, budgetAmount, committedAmount, actualAmount | Budget category | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectExpense` | id, projectId, expenseId, costCategory | Project cost link | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectRisk` | id, projectId, title, probability, impact, ownerId, status | Risk register | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectIssue` | id, projectId, title, severity, ownerId, status | Issue register | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ProjectHandover` | id, projectId, acceptedByCustomerId, acceptedAt, documentId, status | Project completion evidence | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Assets & Field Service

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Asset` | id, organizationId, assetNo, productId, serialNumberId, customerId, siteId, areaId, projectId, status, installedAt | Installed/customer asset | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `AssetInstallation` | id, assetId, projectId, technicianId, installedAt, locationText, checklistId | Installation evidence | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `AssetHistory` | id, assetId, eventType, oldStatus, newStatus, referenceType, referenceId, occurredAt | Asset lifecycle log | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `AssetWarranty` | id, assetId, vendorId, startsAt, expiresAt, terms, status | Warranty coverage | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `AssetQrTag` | id, assetId, token, generatedAt, revokedAt | QR lookup token | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `AssetRMA` | id, assetId, vendorId, rmaNo, status, sentAt, returnedAt, resolution | Vendor return process | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Ticket` | id, organizationId, ticketNo, customerId, siteId, assetId, category, priority, status, openedById, slaPolicyId | Support request | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `TicketComment` | id, ticketId, authorId, visibility, body, createdAt | Ticket conversation | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SlaPolicy` | id, organizationId, name, priority, responseMinutes, resolutionMinutes | SLA rule | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `WorkOrder` | id, organizationId, workOrderNo, ticketId, assetId, projectId, status, scheduledAt, priority | Field job | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `WorkOrderAssignment` | id, workOrderId, technicianId, assignedAt, acceptedAt | Technician assignment | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `TechnicianProfile` | employeeId, availabilityStatus, homeBranchId | Technician extension | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ServiceReport` | id, workOrderId, technicianId, arrivalAt, departureAt, rootCause, resolution, customerSignDocumentId | Completion report | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ServiceReportPart` | id, serviceReportId, productId, qty, stockTransactionId | Part used | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Maintenance

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `MaintenancePlan` | id, organizationId, assetId, contractId, frequencyType, intervalValue, active | Preventive plan | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `MaintenanceSchedule` | id, maintenancePlanId, dueAt, status, generatedWorkOrderId | Planned occurrence | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `MaintenanceExecution` | id, scheduleId, workOrderId, completedAt, result, nextDueAt | Executed maintenance | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `MaintenanceChecklist` | id, organizationId, name, version | Checklist template | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `MaintenancePart` | id, maintenanceExecutionId, productId, qty, stockTransactionId | Maintenance consumable | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Finance & Accounting

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `CustomerInvoice` | id, organizationId, invoiceNo, customerId, projectId, contractId, issueDate, dueDate, status, subtotal, tax, total, balance | Accounts receivable invoice | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CustomerInvoiceItem` | id, invoiceId, productId, description, qty, unitPrice, tax, lineTotal | AR invoice line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SupplierInvoice` | id, organizationId, invoiceNo, vendorId, purchaseOrderId, goodsReceiptId, status, total, matchStatus | Accounts payable invoice | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `SupplierInvoiceItem` | id, supplierInvoiceId, poItemId, description, qty, unitPrice, lineTotal | AP invoice line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Payment` | id, organizationId, paymentNo, direction, partyType, partyId, amount, method, paidAt, status | Cash settlement | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `PaymentAllocation` | id, paymentId, invoiceType, invoiceId, amount | Payment-to-invoice bridge | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Expense` | id, organizationId, employeeId, projectId, category, incurredAt, status, total, approvalRequestId | Employee/operating expense | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ExpenseItem` | id, expenseId, description, amount, tax, documentId | Expense detail | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `FinancialPeriod` | id, organizationId, startDate, endDate, status | Accounting period | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Account` | id, organizationId, code, name, type, parentId, active | Chart of accounts | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `JournalEntry` | id, organizationId, periodId, entryNo, postedAt, referenceType, referenceId, status | Accounting posting header | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `JournalLine` | id, journalEntryId, accountId, debit, credit, projectId, branchId | Double-entry line | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CreditNote` | id, organizationId, customerInvoiceId, noteNo, total, status | Customer credit adjustment | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `DebitNote` | id, organizationId, supplierInvoiceId, noteNo, total, status | Supplier debit adjustment | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Approvals, Documents & Platform

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `ApprovalDefinition` | id, organizationId, subjectType, name, conditionJson, active | Approval workflow definition | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ApprovalStepDefinition` | id, approvalDefinitionId, sequence, approverType, approverRef, minApprovals | Workflow step template | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ApprovalRequest` | id, organizationId, subjectType, subjectId, definitionId, status, requestedById | Approval instance | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ApprovalStep` | id, approvalRequestId, sequence, approverType, approverRef, status | Approval instance step | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `ApprovalAction` | id, approvalStepId, actorId, action, comment, actedAt | Approval audit action | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Document` | id, organizationId, fileName, mimeType, size, bucket, objectKey, checksum, uploadedById | Object metadata | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `DocumentVersion` | id, documentId, versionNo, objectKey, checksum, uploadedAt | File version | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `DocumentLink` | id, documentId, subjectType, subjectId, category | Generic attachment link | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `Notification` | id, organizationId, userId, type, title, body, readAt, createdAt | In-app notification | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `EmailOutbox` | id, organizationId, template, recipient, payloadJson, status, attempts | Reliable email dispatch | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `WebhookEndpoint` | id, organizationId, url, secretEncrypted, eventsJson, active | External webhook config | Core §7 | NOT_IMPLEMENTED |
| `WebhookDelivery` | id, endpointId, eventId, statusCode, attempts, deliveredAt | Webhook attempt log | Core §7 | NOT_IMPLEMENTED |
| `AuditLog` | id, organizationId, actorUserId, action, subjectType, subjectId, beforeJson, afterJson, ip, createdAt | Immutable business audit | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `BusinessEvent` | id, organizationId, type, aggregateType, aggregateId, payloadJson, occurredAt, publishedAt | Outbox/event record | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CustomFieldDefinition` | id, organizationId, subjectType, key, label, dataType, optionsJson | Tenant custom field | Core §7 | NOT_IMPLEMENTED |
| `CustomFieldValue` | id, definitionId, subjectId, valueJson | Custom value | Core §7 | NOT_IMPLEMENTED |
| `BusinessRule` | id, organizationId, triggerType, conditionJson, actionJson, active | Deterministic rule config | Core §7 | NOT_IMPLEMENTED |
| `IdempotencyKey` | id, organizationId, key, route, requestHash, responseJson, expiresAt | Duplicate mutation guard | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Advanced Operations

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `Vehicle` | id, organizationId, branchId, registrationNo, make, model, status | Fleet asset | Core §7 | NOT_IMPLEMENTED |
| `VehicleMaintenance` | id, vehicleId, serviceDate, cost, odometer, notes | Vehicle service history | Core §7 | NOT_IMPLEMENTED |
| `FuelLog` | id, vehicleId, employeeId, date, liters, cost, odometer | Fuel tracking | Core §7 | NOT_IMPLEMENTED |
| `Tool` | id, organizationId, toolNo, name, serialNo, status | Reusable field tool | Core §7 | NOT_IMPLEMENTED |
| `ToolAssignment` | id, toolId, employeeId, issuedAt, dueAt, returnedAt | Tool custody | Core §7 | NOT_IMPLEMENTED |
| `SafetyIncident` | id, organizationId, projectId, siteId, reportedById, severity, status | Safety incident | Core §7 | IMPLEMENTED_STATIC_ONLY |
| `CorrectiveAction` | id, safetyIncidentId, ownerId, dueDate, status, action | Safety corrective action | Core §7 | NOT_IMPLEMENTED |
| `InspectionTemplate` | id, organizationId, subjectType, name, version | Quality checklist template | Core §7 | NOT_IMPLEMENTED |
| `InspectionRun` | id, templateId, subjectType, subjectId, inspectorId, result, completedAt | Inspection execution | Core §7 | IMPLEMENTED_STATIC_ONLY |

## Number Sequence

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `NumberSequence` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `NumberSequenceReservation` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Vendor Onboarding & Risk

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `VendorOnboardingRequest` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `VendorDocument` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `VendorBankAccount` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `VendorRiskAssessment` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `VendorBlacklist` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `VendorCategoryApproval` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Purchase Contracts / Blanket PO

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `PurchaseContract` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseContractItem` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `BlanketPurchaseOrder` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `BlanketPurchaseOrderItem` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseReleaseOrder` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `PurchaseReleaseOrderItem` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Stock Count / Cycle Count

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `StockCount` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `StockCountLine` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `StockCountVariance` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `StockCountApproval` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `StockCountPosting` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Landed Cost / Valuation

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `LandedCost` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `LandedCostLine` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `LandedCostAllocation` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `InventoryCostLayer` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Tax Engine

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `TaxCode` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TaxRate` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TaxRule` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TaxJurisdiction` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TaxTransaction` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `WithholdingTaxRule` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Bank & Cash Management

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `BankAccount` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `CashAccount` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `BankStatement` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `BankStatementLine` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `BankReconciliation` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `PaymentVoucher` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ReceiptVoucher` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ChequeRegister` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Data Import & Quality

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `ImportTemplate` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ImportBatch` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ImportMapping` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ImportRow` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ImportRowError` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `DuplicateCheckRule` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Communication Log

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `CommunicationTemplate` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `CommunicationLog` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `EmailDeliveryLog` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SmsDeliveryLog` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `MessageAttachment` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Technician GPS / Visit

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `ServiceVisit` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ServiceVisitLocation` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TechnicianLocationPing` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TechnicianRoute` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `WorkOrderCheckIn` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `WorkOrderCheckOut` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Custom Reporting

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `ReportTemplate` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SavedReport` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ScheduledReport` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ReportExecution` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `DashboardWidget` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `UserDashboard` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SavedView` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |

## Feature Flags / SaaS Billing

| Entity | Key fields / scope note | Purpose | Source | State |
|---|---|---|---|---|
| `FeatureFlag` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `OrganizationFeature` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `ModuleConfiguration` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SystemConfigurationHistory` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SaaSPlan` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SaaSSubscription` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SaaSSubscriptionFeature` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `SaaSInvoice` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TenantUsageMetric` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
| `TenantStorageUsage` | See Appendix F.2; tenant-owned tables require organizationId; branchId where branch-scoped | Commercial completeness entity | Appendix F.2 | IMPLEMENTED_STATIC_ONLY |
