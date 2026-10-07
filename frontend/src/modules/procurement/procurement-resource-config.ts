import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type ProcurementResourceKey =
  | 'purchase-requests'
  | 'rfqs'
  | 'supplier-quotations'
  | 'purchase-orders'
  | 'goods-receipts'
  | 'purchase-contracts'
  | 'landed-costs'
  | 'vendor-onboarding';

export type ProcurementCommandKey =
  | 'submit-purchase-request'
  | 'approve-purchase-request'
  | 'reject-purchase-request'
  | 'create-rfq-from-purchase-request'
  | 'invite-vendors'
  | 'publish-rfq'
  | 'close-rfq'
  | 'select-supplier-quotation'
  | 'submit-purchase-order'
  | 'approve-purchase-order'
  | 'send-purchase-order'
  | 'cancel-purchase-order'
  | 'receive-goods-for-po'
  | 'inspect-goods-receipt'
  | 'approve-purchase-contract'
  | 'create-purchase-release-order'
  | 'allocate-landed-cost'
  | 'post-landed-cost'
  | 'submit-vendor-onboarding'
  | 'approve-vendor-onboarding'
  | 'blacklist-vendor';

export type ProcurementCommandConfig = {
  key: ProcurementCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  destructive?: boolean;
  prefillRecordIdField?: string | undefined;
  irreversibleEffects: readonly string[];
};

export type ProcurementResourceConfig = {
  key: ProcurementResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  listSupported: boolean;
  detailEndpointTemplate?: string | undefined;
  endpointMode: 'crud' | 'command-only' | 'create-only' | 'read-only';
  viewPermission: PermissionKey;
  createPermission?: PermissionKey | undefined;
  updatePermission?: PermissionKey | undefined;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
  commands: readonly ProcurementCommandConfig[];
};

const procurementTransactionNote =
  'Procurement frontend actions never mutate status with a free PATCH. Submit, approve, reject, RFQ conversion, vendor invitation, supplier selection, PO approval, GRN receipt, inspection, landed-cost posting and vendor-risk actions use explicit Fastify command endpoints, tenant/branch checks, audit events and PostgreSQL transactions where stock/finance/approval state must be immediately consistent.';

export const ProcurementResourceConfigs = {
  'purchase-requests': {
    key: 'purchase-requests',
    title: 'Purchase Requests',
    singularTitle: 'Purchase Request',
    routeBase: '/procurement/purchase-requests',
    endpoint: '/purchase-requests',
    listSupported: true,
    detailEndpointTemplate: '/purchase-requests/:id',
    endpointMode: 'crud',
    viewPermission: 'purchase_request.view',
    createPermission: 'purchase_request.create',
    updatePermission: 'purchase_request.update',
    description: 'Internal material or project purchase need. Approved PRs become RFQs through a command endpoint, never by editing status directly.',
    columns: [
      { key: 'prNo', label: 'PR No' },
      { key: 'projectId', label: 'Project' },
      { key: 'requesterId', label: 'Requester' },
      { key: 'requiredDate', label: 'Required date' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['prNo', 'projectId', 'requesterId', 'requiredDate', 'status'],
    profileFields: ['branchId', 'departmentId', 'reason', 'approvalRequestId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Approval workflow', description: 'Submit moves the PR into approval, and approval/rejection creates approval actions and audit evidence.' },
      { title: 'RFQ eligibility', description: 'Create RFQ is shown only as a command once the backend reports an approved state.' },
      { title: 'Project material continuity', description: 'Project material requirements can create PRs; downstream RFQ/PO/GRN evidence stays linked to the PR.' },
    ],
    commands: [
      { key: 'submit-purchase-request', label: 'Submit PR', endpointTemplate: '/purchase-requests/:id/submit', requiredPermission: 'purchase_request.submit', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Creates or advances the approval request.', 'Makes the draft unavailable for unrestricted editing.'] },
      { key: 'approve-purchase-request', label: 'Approve PR', endpointTemplate: '/purchase-requests/:id/approve', requiredPermission: 'purchase_request.approve', idempotent: true, allowedStates: ['SUBMITTED', 'UNDER_REVIEW'], irreversibleEffects: ['Creates an approval audit action.', 'Makes the purchase request eligible for RFQ creation.'] },
      { key: 'reject-purchase-request', label: 'Reject PR', endpointTemplate: '/purchase-requests/:id/reject', requiredPermission: 'purchase_request.approve', idempotent: true, allowedStates: ['SUBMITTED', 'UNDER_REVIEW'], destructive: true, irreversibleEffects: ['Records the rejection reason.', 'Blocks RFQ conversion unless a new allowed workflow restarts the request.'] },
      { key: 'create-rfq-from-purchase-request', label: 'Create RFQ from approved PR', endpointTemplate: '/purchase-requests/:id/create-rfq', requiredPermission: 'rfq.create', idempotent: true, allowedStates: ['APPROVED'], irreversibleEffects: ['Creates a linked RFQ from the approved PR.', 'Keeps the procurement chain traceable from PR to vendor sourcing.'] },
    ],
  },
  rfqs: {
    key: 'rfqs',
    title: 'RFQs',
    singularTitle: 'RFQ',
    routeBase: '/procurement/rfqs',
    endpoint: '/rfqs',
    listSupported: true,
    endpointMode: 'command-only',
    viewPermission: 'rfq.view',
    createPermission: 'rfq.create',
    description: 'Request for quotation sourcing workspace. Vendor invitation, publish/close and comparison are command and read-model surfaces.',
    columns: [
      { key: 'rfqNo', label: 'RFQ No' },
      { key: 'purchaseRequestId', label: 'Purchase request' },
      { key: 'closesAt', label: 'Closes at' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['rfqNo', 'purchaseRequestId', 'closesAt', 'status'],
    profileFields: ['createdAt', 'updatedAt', 'publishedAt', 'closedAt'],
    relatedPanels: [
      { title: 'Supplier quotations', description: 'Vendor quotations are recorded against this RFQ and compared deterministically by cost, delivery and warranty.', href: '/procurement/supplier-quotations/create' },
      { title: 'Quotation comparison', description: 'The comparison route reads /rfqs/:id/comparison and helps the procurement officer select the preferred supplier.', href: '/procurement/rfqs/[id]/comparison' },
      { title: 'Vendor risk control', description: 'Only approved vendors should be invited or selected. Unapproved/blacklisted vendors are blocked server-side.' },
    ],
    commands: [
      { key: 'invite-vendors', label: 'Invite vendors', endpointTemplate: '/rfqs/:id/invite-vendors', requiredPermission: 'rfq.update', idempotent: true, allowedStates: ['DRAFT', 'PUBLISHED', 'OPEN'], irreversibleEffects: ['Creates RFQ vendor invitations.', 'May notify vendors through worker/email queues after commit.'] },
      { key: 'publish-rfq', label: 'Publish RFQ', endpointTemplate: '/rfqs/:id/publish', requiredPermission: 'rfq.publish', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Makes the RFQ visible for vendor response.', 'Records a status transition and audit action.'] },
      { key: 'close-rfq', label: 'Close RFQ', endpointTemplate: '/rfqs/:id/close', requiredPermission: 'rfq.close', idempotent: true, allowedStates: ['OPEN', 'PUBLISHED'], destructive: true, irreversibleEffects: ['Stops new supplier quotation collection.', 'Preserves submitted quotations for comparison/selection evidence.'] },
    ],
  },
  'supplier-quotations': {
    key: 'supplier-quotations',
    title: 'Supplier Quotations',
    singularTitle: 'Supplier Quotation',
    routeBase: '/procurement/supplier-quotations',
    endpoint: '/supplier-quotations',
    listSupported: false,
    endpointMode: 'create-only',
    viewPermission: 'supplier_quotation.view',
    createPermission: 'supplier_quotation.create',
    description: 'Supplier quote capture is create/command driven. Comparison is exposed through the RFQ comparison read model instead of a duplicate frontend calculation.',
    columns: [
      { key: 'quoteRef', label: 'Quote ref' },
      { key: 'rfqId', label: 'RFQ' },
      { key: 'vendorId', label: 'Vendor' },
      { key: 'total', label: 'Total' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['quoteRef', 'rfqId', 'vendorId', 'status'],
    profileFields: ['validity', 'total', 'paymentTerms', 'createdAt'],
    relatedPanels: [
      { title: 'RFQ comparison source', description: 'Use /rfqs/:id/comparison to compare vendor cost, delivery and warranty without hand-built frontend math.' },
      { title: 'Selection control', description: 'Select quotation is a command that rejects competing quotations and awards the RFQ in one backend transaction.' },
    ],
    commands: [
      { key: 'select-supplier-quotation', label: 'Select supplier quotation', endpointTemplate: '/supplier-quotations/:id/select', requiredPermission: 'supplier_quotation.select', idempotent: true, allowedStates: ['SUBMITTED'], irreversibleEffects: ['Awards the source RFQ.', 'Rejects other quotations for the same RFQ.', 'Makes the selected quotation eligible for PO creation.'] },
    ],
  },
  'purchase-orders': {
    key: 'purchase-orders',
    title: 'Purchase Orders',
    singularTitle: 'Purchase Order',
    routeBase: '/procurement/purchase-orders',
    endpoint: '/purchase-orders',
    listSupported: true,
    endpointMode: 'command-only',
    viewPermission: 'purchase_order.view',
    createPermission: 'purchase_order.create',
    description: 'Purchase commitment generated from selected supplier quotation. Approval, send, cancel and receiving are command surfaces.',
    columns: [
      { key: 'poNo', label: 'PO No' },
      { key: 'vendorId', label: 'Vendor' },
      { key: 'supplierQuotationId', label: 'Supplier quotation' },
      { key: 'expectedDate', label: 'Expected date' },
      { key: 'status', label: 'Status' },
      { key: 'total', label: 'Total' },
    ],
    identityFields: ['poNo', 'vendorId', 'supplierQuotationId', 'expectedDate', 'status', 'total'],
    profileFields: ['branchId', 'orderDate', 'approvalRequestId', 'sentAt', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Approval and maker-checker', description: 'Submit and approve PO use the approval engine; the creator cannot self-approve when maker-checker applies.' },
      { title: 'Goods receiving', description: 'Receive goods creates GRN, accepted/damaged quantities, serial/batch capture and inventory ledger updates.' },
      { title: 'Supplier invoice match', description: 'Finance supplier invoice three-way match uses PO + GRN + supplier invoice values.' },
    ],
    commands: [
      { key: 'submit-purchase-order', label: 'Submit PO', endpointTemplate: '/purchase-orders/:id/submit', requiredPermission: 'purchase_order.submit', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Creates PO approval workflow.', 'Prevents silent approval by draft edit.'] },
      { key: 'approve-purchase-order', label: 'Approve PO', endpointTemplate: '/purchase-orders/:id/approve', requiredPermission: 'purchase_order.approve', idempotent: true, allowedStates: ['APPROVAL_PENDING'], irreversibleEffects: ['Records maker-checker approval evidence.', 'Makes PO eligible for send and receiving controls.'] },
      { key: 'send-purchase-order', label: 'Send PO to vendor', endpointTemplate: '/purchase-orders/:id/send', requiredPermission: 'purchase_order.send', idempotent: true, allowedStates: ['APPROVED'], irreversibleEffects: ['Queues vendor document/email after commit.', 'Records sent status and audit event.'] },
      { key: 'cancel-purchase-order', label: 'Cancel PO', endpointTemplate: '/purchase-orders/:id/cancel', requiredPermission: 'purchase_order.cancel', idempotent: true, allowedStates: ['DRAFT', 'APPROVAL_PENDING', 'APPROVED', 'SENT'], destructive: true, irreversibleEffects: ['Cancels the PO only if receipt state allows it.', 'Requires reason and audit trail.'] },
      { key: 'receive-goods-for-po', label: 'Receive goods', endpointTemplate: '/goods-receipts', requiredPermission: 'goods_receipt.create', idempotent: true, allowedStates: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'], prefillRecordIdField: 'purchaseOrderId', irreversibleEffects: ['Creates a GRN and accepted/damaged line evidence.', 'Updates PO received quantities and immutable stock ledger in a transaction.'] },
    ],
  },
  'goods-receipts': {
    key: 'goods-receipts',
    title: 'Goods Receipts / GRNs',
    singularTitle: 'Goods Receipt',
    routeBase: '/procurement/goods-receipts',
    endpoint: '/goods-receipts',
    listSupported: true,
    detailEndpointTemplate: '/goods-receipts/:id',
    endpointMode: 'command-only',
    viewPermission: 'goods_receipt.view',
    createPermission: 'goods_receipt.create',
    description: 'Receiving record for PO delivery. GRN creation posts accepted stock and serial/batch evidence through backend transactions.',
    columns: [
      { key: 'grnNo', label: 'GRN No' },
      { key: 'purchaseOrderId', label: 'Purchase order' },
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'receivedAt', label: 'Received at' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['grnNo', 'purchaseOrderId', 'warehouseId', 'receivedAt', 'status'],
    profileFields: ['receivedById', 'acceptedQty', 'damagedQty', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Inventory posting', description: 'GRN creation writes stock transactions and PO received quantities atomically.' },
      { title: 'Quality inspection', description: 'Inspection is an explicit command and does not edit the GRN generically.' },
      { title: 'Three-way match source', description: 'Supplier invoices match against the PO and GRN before approval/payment.' },
    ],
    commands: [
      { key: 'inspect-goods-receipt', label: 'Record quality inspection', endpointTemplate: '/goods-receipts/:id/inspect', requiredPermission: 'goods_receipt.inspect', idempotent: true, allowedStates: ['RECEIVED', 'INSPECTION_PENDING'], irreversibleEffects: ['Records accepted/partial/rejected inspection result.', 'Keeps inspection separate from destructive GRN edits.'] },
    ],
  },
  'purchase-contracts': {
    key: 'purchase-contracts',
    title: 'Purchase Contracts / Blanket POs',
    singularTitle: 'Purchase Contract',
    routeBase: '/procurement/purchase-contracts',
    endpoint: '/purchase-contracts',
    listSupported: false,
    endpointMode: 'create-only',
    viewPermission: 'purchase_contract.manage',
    createPermission: 'purchase_contract.manage',
    description: 'Long-term supplier rate/quantity/value agreement. Release orders consume approved contract balances and may create PO lines.',
    columns: [
      { key: 'contractNo', label: 'Contract no' },
      { key: 'vendorId', label: 'Vendor' },
      { key: 'status', label: 'Status' },
      { key: 'maxValue', label: 'Max value' },
    ],
    identityFields: ['contractNo', 'vendorId', 'status'],
    profileFields: ['startDate', 'endDate', 'maxValue', 'releasedValue', 'approvalRequestId'],
    relatedPanels: [
      { title: 'Approval control', description: 'Purchase contracts are approved before release orders consume quantity/value.' },
      { title: 'Release orders', description: 'Release order creation checks remaining contract quantity/value and can create downstream PO lines.' },
    ],
    commands: [
      { key: 'approve-purchase-contract', label: 'Approve purchase contract', endpointTemplate: '/purchase-contracts/:id/approve', requiredPermission: 'purchase_contract.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Activates the contract for release orders.', 'Creates approval/audit evidence.'] },
      { key: 'create-purchase-release-order', label: 'Create release order', endpointTemplate: '/purchase-contracts/:id/create-release-order', requiredPermission: 'purchase_contract.manage', idempotent: true, allowedStates: ['ACTIVE'], irreversibleEffects: ['Consumes approved contract balance.', 'May create purchase order lines for repeated purchases.'] },
    ],
  },
  'landed-costs': {
    key: 'landed-costs',
    title: 'Landed Costs',
    singularTitle: 'Landed Cost',
    routeBase: '/procurement/landed-costs',
    endpoint: '/landed-costs',
    listSupported: false,
    endpointMode: 'create-only',
    viewPermission: 'landed_cost.manage',
    createPermission: 'landed_cost.manage',
    description: 'Freight, customs, insurance, handling and transport cost capture. Allocation and posting affect inventory valuation and project costing.',
    columns: [
      { key: 'purchaseOrderId', label: 'PO' },
      { key: 'goodsReceiptId', label: 'GRN' },
      { key: 'allocationMethod', label: 'Allocation' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['purchaseOrderId', 'goodsReceiptId', 'allocationMethod', 'status'],
    profileFields: ['supplierInvoiceId', 'totalAmount', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Cost allocation', description: 'Costs are allocated to receipt lines by value, quantity, weight or manual rules.' },
      { title: 'Inventory valuation', description: 'Posting updates inventory cost layers and recalculates project profitability consistently.' },
    ],
    commands: [
      { key: 'allocate-landed-cost', label: 'Allocate landed cost', endpointTemplate: '/landed-costs/:id/allocate', requiredPermission: 'landed_cost.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Stores allocation rows for each receipt/product/warehouse line.', 'Prepares the landed cost for transactional posting.'] },
      { key: 'post-landed-cost', label: 'Post landed cost', endpointTemplate: '/landed-costs/:id/post', requiredPermission: 'landed_cost.manage', idempotent: true, allowedStates: ['ALLOCATED'], irreversibleEffects: ['Updates inventory cost layers and project costing.', 'Creates audit evidence and downstream profitability refresh events.'] },
    ],
  },
  'vendor-onboarding': {
    key: 'vendor-onboarding',
    title: 'Vendor Onboarding & Risk',
    singularTitle: 'Vendor Onboarding Request',
    routeBase: '/procurement/vendor-onboarding',
    endpoint: '/vendor-onboarding/requests',
    listSupported: false,
    endpointMode: 'create-only',
    viewPermission: 'vendor.onboard',
    createPermission: 'vendor.onboard',
    description: 'Vendor document, bank and risk verification before vendors can be used in RFQ, PO or payment workflows.',
    columns: [
      { key: 'vendorId', label: 'Vendor' },
      { key: 'status', label: 'Status' },
      { key: 'riskRating', label: 'Risk' },
      { key: 'approvalRequestId', label: 'Approval' },
    ],
    identityFields: ['vendorId', 'status', 'riskRating'],
    profileFields: ['riskScore', 'approvalRequestId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Procurement blocking rule', description: 'Unapproved or blacklisted vendors cannot be invited, selected or used for PO/payment without explicit override and audit.' },
      { title: 'Document and bank evidence', description: 'Approval requires document and bank verification plus risk scoring.' },
    ],
    commands: [
      { key: 'submit-vendor-onboarding', label: 'Submit onboarding request', endpointTemplate: '/vendor-onboarding/:id/submit', requiredPermission: 'vendor.onboard', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Moves vendor onboarding into review.', 'Creates approval/audit evidence.'] },
      { key: 'approve-vendor-onboarding', label: 'Approve or blacklist onboarding', endpointTemplate: '/vendor-onboarding/:id/approve', requiredPermission: 'vendor.risk.manage', idempotent: true, allowedStates: ['SUBMITTED'], irreversibleEffects: ['Approves category/vendor usage or blacklists the vendor.', 'Updates vendor risk governance with audit records.'] },
      { key: 'blacklist-vendor', label: 'Blacklist vendor', endpointTemplate: '/vendors/:id/blacklist', requiredPermission: 'vendor.risk.manage', idempotent: true, allowedStates: ['ANY'], destructive: true, prefillRecordIdField: 'vendorId', irreversibleEffects: ['Prevents normal RFQ/PO/payment use.', 'Creates a high-risk audit event and requires explicit override for future use.'] },
    ],
  },
} satisfies Record<ProcurementResourceKey, ProcurementResourceConfig>;

export const ProcurementResourceKeys = Object.keys(ProcurementResourceConfigs) as ProcurementResourceKey[];

export function getProcurementResourceConfig(key: ProcurementResourceKey): ProcurementResourceConfig {
  return ProcurementResourceConfigs[key];
}

export const ProcurementCompletionPrinciples = [
  procurementTransactionNote,
  'The frontend exposes PR -> approval -> RFQ -> supplier quotation -> comparison -> selected quotation -> PO -> GRN -> inspection -> supplier-invoice match as one connected workflow.',
  'Every procurement list/grid uses TanStack Table through the shared DataTable wrapper when a locked list endpoint exists.',
  'Every create/edit/command surface uses React Hook Form with shared Zod contracts and centralized TanStack Query invalidation.',
  'Next.js route handlers are not used for procurement business logic; all business actions call the Fastify /api/v1 surface through the centralized API client.',
] as const;
