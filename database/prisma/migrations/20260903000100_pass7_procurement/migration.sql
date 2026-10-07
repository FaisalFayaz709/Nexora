-- NEXORA Pass 7 — Procurement
CREATE TABLE "MaterialRequirement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL, "requestedById" UUID NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "MaterialRequirementItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "materialRequirementId" UUID NOT NULL,
  "productId" UUID NOT NULL, "qty" DECIMAL(18,4) NOT NULL CHECK ("qty">0)
);
CREATE TABLE "PurchaseRequest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL,
  "projectId" UUID NOT NULL, "prNo" VARCHAR(160) NOT NULL, "requesterId" UUID NOT NULL,
  "requiredDate" DATE NOT NULL, "reason" TEXT NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "approvalRequestId" UUID, "submittedAt" TIMESTAMPTZ(6), "approvedAt" TIMESTAMPTZ(6), "rejectedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseRequest_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CONVERTED_TO_RFQ','CANCELLED')),
  CONSTRAINT "PurchaseRequest_organizationId_prNo_key" UNIQUE ("organizationId","prNo")
);
CREATE TABLE "PurchaseRequestItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "purchaseRequestId" UUID NOT NULL, "productId" UUID NOT NULL,
  "description" TEXT, "qty" DECIMAL(18,4) NOT NULL CHECK ("qty">0), "estimatedPrice" DECIMAL(18,2) NOT NULL CHECK ("estimatedPrice">=0)
);
CREATE TABLE "RFQ" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "purchaseRequestId" UUID NOT NULL,
  "rfqNo" VARCHAR(160) NOT NULL, "closesAt" TIMESTAMPTZ(6) NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMPTZ(6), "closedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RFQ_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','OPEN','CLOSED','AWARDED','CANCELLED')),
  CONSTRAINT "RFQ_organizationId_rfqNo_key" UNIQUE ("organizationId","rfqNo")
);
CREATE TABLE "RFQVendor" (
  "rfqId" UUID NOT NULL, "vendorId" UUID NOT NULL, "invitedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseStatus" VARCHAR(50) NOT NULL DEFAULT 'INVITED', PRIMARY KEY ("rfqId","vendorId")
);
CREATE TABLE "SupplierQuotation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "rfqId" UUID NOT NULL, "vendorId" UUID NOT NULL,
  "quoteRef" VARCHAR(160) NOT NULL, "validity" DATE NOT NULL, "paymentTerms" VARCHAR(500), "total" DECIMAL(18,2) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', "selectedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierQuotation_vendor_quote_key" UNIQUE ("organizationId","vendorId","quoteRef")
);
CREATE TABLE "SupplierQuotationItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "supplierQuotationId" UUID NOT NULL, "productId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL CHECK ("qty">0), "unitPrice" DECIMAL(18,4) NOT NULL CHECK ("unitPrice">=0),
  "deliveryDays" INTEGER NOT NULL CHECK ("deliveryDays">=0), "warrantyMonths" INTEGER NOT NULL CHECK ("warrantyMonths">=0)
);
CREATE TABLE "PurchaseOrder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL,
  "vendorId" UUID NOT NULL, "supplierQuotationId" UUID, "poNo" VARCHAR(160) NOT NULL,
  "orderDate" DATE NOT NULL, "expectedDate" DATE NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(18,2) NOT NULL, "requesterId" UUID NOT NULL, "submittedAt" TIMESTAMPTZ(6),
  "approvedAt" TIMESTAMPTZ(6), "approvedById" UUID, "sentAt" TIMESTAMPTZ(6), "cancelledAt" TIMESTAMPTZ(6),
  "cancellationReason" TEXT, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_status_check" CHECK ("status" IN ('DRAFT','APPROVAL_PENDING','APPROVED','SENT','PARTIALLY_RECEIVED','RECEIVED','CLOSED','CANCELLED')),
  CONSTRAINT "PurchaseOrder_organizationId_poNo_key" UNIQUE ("organizationId","poNo")
);
CREATE TABLE "PurchaseOrderItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "purchaseOrderId" UUID NOT NULL, "productId" UUID NOT NULL,
  "orderedQty" DECIMAL(18,4) NOT NULL CHECK ("orderedQty">0), "receivedQty" DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK ("receivedQty">=0),
  "unitPrice" DECIMAL(18,4) NOT NULL CHECK ("unitPrice">=0), "tax" DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK ("tax">=0)
);
CREATE TABLE "GoodsReceipt" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "purchaseOrderId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL, "grnNo" VARCHAR(160) NOT NULL, "receivedAt" TIMESTAMPTZ(6) NOT NULL,
  "receivedById" UUID NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceipt_status_check" CHECK ("status" IN ('DRAFT','RECEIVED','INSPECTION_PENDING','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED')),
  CONSTRAINT "GoodsReceipt_organizationId_grnNo_key" UNIQUE ("organizationId","grnNo")
);
CREATE TABLE "GoodsReceiptItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "goodsReceiptId" UUID NOT NULL, "poItemId" UUID NOT NULL, "productId" UUID NOT NULL,
  "receivedQty" DECIMAL(18,4) NOT NULL CHECK ("receivedQty">0), "acceptedQty" DECIMAL(18,4) NOT NULL CHECK ("acceptedQty">=0),
  "damagedQty" DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK ("damagedQty">=0), "serialsJson" JSONB, "batchesJson" JSONB,
  CONSTRAINT "GoodsReceiptItem_quantities_check" CHECK ("acceptedQty" + "damagedQty" <= "receivedQty")
);
CREATE TABLE "GoodsReceiptInspection" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "goodsReceiptId" UUID NOT NULL,
  "inspectorId" UUID NOT NULL, "result" VARCHAR(50) NOT NULL, "notes" TEXT,
  "inspectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceiptInspection_result_check" CHECK ("result" IN ('ACCEPTED','PARTIALLY_ACCEPTED','REJECTED'))
);

CREATE INDEX "MaterialRequirement_org_project_status_idx" ON "MaterialRequirement"("organizationId","projectId","status");
CREATE INDEX "PurchaseRequest_org_branch_status_created_idx" ON "PurchaseRequest"("organizationId","branchId","status","createdAt");
CREATE INDEX "PurchaseRequest_org_project_idx" ON "PurchaseRequest"("organizationId","projectId");
CREATE INDEX "PurchaseRequestItem_pr_product_idx" ON "PurchaseRequestItem"("purchaseRequestId","productId");
CREATE INDEX "RFQ_org_status_close_idx" ON "RFQ"("organizationId","status","closesAt");
CREATE INDEX "RFQ_org_pr_idx" ON "RFQ"("organizationId","purchaseRequestId");
CREATE INDEX "SupplierQuotation_org_rfq_status_idx" ON "SupplierQuotation"("organizationId","rfqId","status");
CREATE INDEX "PurchaseOrder_org_branch_status_created_idx" ON "PurchaseOrder"("organizationId","branchId","status","createdAt");
CREATE INDEX "PurchaseOrder_org_vendor_idx" ON "PurchaseOrder"("organizationId","vendorId");
CREATE INDEX "GoodsReceipt_org_po_received_idx" ON "GoodsReceipt"("organizationId","purchaseOrderId","receivedAt");
CREATE INDEX "GoodsReceipt_org_warehouse_status_idx" ON "GoodsReceipt"("organizationId","warehouseId","status");
CREATE INDEX "GoodsReceiptItem_poItem_idx" ON "GoodsReceiptItem"("poItemId");
CREATE INDEX "GoodsReceiptInspection_org_grn_idx" ON "GoodsReceiptInspection"("organizationId","goodsReceiptId","inspectedAt");

ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_requestedBy_fkey" FOREIGN KEY ("requestedById") REFERENCES "Employee"("id") ON DELETE RESTRICT;
ALTER TABLE "MaterialRequirementItem" ADD CONSTRAINT "MaterialRequirementItem_header_fkey" FOREIGN KEY ("materialRequirementId") REFERENCES "MaterialRequirement"("id") ON DELETE CASCADE;
ALTER TABLE "MaterialRequirementItem" ADD CONSTRAINT "MaterialRequirementItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_branch_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requester_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_header_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE;
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT;
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_pr_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT;
ALTER TABLE "RFQVendor" ADD CONSTRAINT "RFQVendor_rfq_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE CASCADE;
ALTER TABLE "RFQVendor" ADD CONSTRAINT "RFQVendor_vendor_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT;
ALTER TABLE "SupplierQuotation" ADD CONSTRAINT "SupplierQuotation_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "SupplierQuotation" ADD CONSTRAINT "SupplierQuotation_rfq_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT;
ALTER TABLE "SupplierQuotation" ADD CONSTRAINT "SupplierQuotation_vendor_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT;
ALTER TABLE "SupplierQuotationItem" ADD CONSTRAINT "SupplierQuotationItem_quote_fkey" FOREIGN KEY ("supplierQuotationId") REFERENCES "SupplierQuotation"("id") ON DELETE CASCADE;
ALTER TABLE "SupplierQuotationItem" ADD CONSTRAINT "SupplierQuotationItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branch_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quote_fkey" FOREIGN KEY ("supplierQuotationId") REFERENCES "SupplierQuotation"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requester_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedBy_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_header_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_po_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_warehouse_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedBy_fkey" FOREIGN KEY ("receivedById") REFERENCES "Employee"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_header_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE;
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_poItem_fkey" FOREIGN KEY ("poItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceiptInspection" ADD CONSTRAINT "GoodsReceiptInspection_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "GoodsReceiptInspection" ADD CONSTRAINT "GoodsReceiptInspection_grn_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE;
ALTER TABLE "GoodsReceiptInspection" ADD CONSTRAINT "GoodsReceiptInspection_inspector_fkey" FOREIGN KEY ("inspectorId") REFERENCES "Employee"("id") ON DELETE RESTRICT;

-- Project and ApprovalRequest physical foreign keys are intentionally deferred to their owning passes.
