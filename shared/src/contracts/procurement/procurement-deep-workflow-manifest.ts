export const ProcurementDeepWorkflowMaturity =
  'PASS_C4_BLUEPRINT_ALIGNED_COMMAND_AND_STATE_MANIFEST' as const;

export const ProcurementLifecycleStages = Object.freeze([
  'MATERIAL_REQUIREMENT',
  'PURCHASE_REQUEST',
  'APPROVAL',
  'RFQ',
  'SUPPLIER_QUOTATION',
  'QUOTATION_COMPARISON',
  'SUPPLIER_SELECTION',
  'PURCHASE_ORDER',
  'GOODS_RECEIPT_NOTE',
  'QUALITY_INSPECTION',
  'WAREHOUSE_STOCK',
  'SUPPLIER_INVOICE_SOURCE',
] as const);

export const ProcurementCommandEndpoints = Object.freeze([
  { command: 'create-purchase-request', method: 'POST', endpoint: '/api/v1/purchase-requests', permission: 'purchase_request.create', atomic: true },
  { command: 'submit-purchase-request', method: 'POST', endpoint: '/api/v1/purchase-requests/:id/submit', permission: 'purchase_request.submit', atomic: true },
  { command: 'approve-purchase-request', method: 'POST', endpoint: '/api/v1/purchase-requests/:id/approve', permission: 'purchase_request.approve', atomic: true },
  { command: 'reject-purchase-request', method: 'POST', endpoint: '/api/v1/purchase-requests/:id/reject', permission: 'purchase_request.approve', atomic: true },
  { command: 'create-rfq-from-purchase-request', method: 'POST', endpoint: '/api/v1/purchase-requests/:id/create-rfq', permission: 'rfq.create', atomic: true },
  { command: 'invite-vendors', method: 'POST', endpoint: '/api/v1/rfqs/:id/invite-vendors', permission: 'rfq.update', atomic: true },
  { command: 'publish-rfq', method: 'POST', endpoint: '/api/v1/rfqs/:id/publish', permission: 'rfq.publish', atomic: true },
  { command: 'close-rfq', method: 'POST', endpoint: '/api/v1/rfqs/:id/close', permission: 'rfq.close', atomic: true },
  { command: 'record-supplier-quotation', method: 'POST', endpoint: '/api/v1/supplier-quotations', permission: 'supplier_quotation.create', atomic: true },
  { command: 'select-supplier-quotation', method: 'POST', endpoint: '/api/v1/supplier-quotations/:id/select', permission: 'supplier_quotation.select', atomic: true },
  { command: 'create-purchase-order', method: 'POST', endpoint: '/api/v1/purchase-orders', permission: 'purchase_order.create', atomic: true },
  { command: 'submit-purchase-order', method: 'POST', endpoint: '/api/v1/purchase-orders/:id/submit', permission: 'purchase_order.submit', atomic: true },
  { command: 'approve-purchase-order', method: 'POST', endpoint: '/api/v1/purchase-orders/:id/approve', permission: 'purchase_order.approve', atomic: true },
  { command: 'send-purchase-order', method: 'POST', endpoint: '/api/v1/purchase-orders/:id/send', permission: 'purchase_order.send', atomic: true },
  { command: 'cancel-purchase-order', method: 'POST', endpoint: '/api/v1/purchase-orders/:id/cancel', permission: 'purchase_order.cancel', atomic: true },
  { command: 'receive-goods', method: 'POST', endpoint: '/api/v1/goods-receipts', permission: 'goods_receipt.create', atomic: true, idempotencyKey: true },
  { command: 'inspect-goods-receipt', method: 'POST', endpoint: '/api/v1/goods-receipts/:id/inspect', permission: 'goods_receipt.inspect', atomic: true },
] as const);


export const ProcurementQueryEndpoints = Object.freeze([
  { query: 'quotation-comparison', method: 'GET', endpoint: '/api/v1/rfqs/:id/comparison', permission: 'supplier_quotation.view' },
  { query: 'purchase-request-list', method: 'GET', endpoint: '/api/v1/purchase-requests', permission: 'purchase_request.view' },
  { query: 'purchase-order-list', method: 'GET', endpoint: '/api/v1/purchase-orders', permission: 'purchase_order.view' },
  { query: 'goods-receipt-list', method: 'GET', endpoint: '/api/v1/goods-receipts', permission: 'goods_receipt.view' },
] as const);

export const ProcurementStateTransitionManifest = Object.freeze({
  purchaseRequest: {
    create: { from: null, to: 'DRAFT' },
    submit: { from: ['DRAFT'], to: 'UNDER_REVIEW' },
    approve: { from: ['UNDER_REVIEW'], to: 'APPROVED' },
    reject: { from: ['UNDER_REVIEW'], to: 'REJECTED' },
    returnForCorrection: { from: ['UNDER_REVIEW'], to: 'DRAFT' },
    createRfq: { from: ['APPROVED'], to: 'CONVERTED_TO_RFQ' },
  },
  rfq: {
    create: { from: null, to: 'DRAFT' },
    inviteVendors: { from: ['DRAFT'], to: 'DRAFT' },
    publish: { from: ['DRAFT'], to: 'PUBLISHED' },
    recordQuotation: { from: ['PUBLISHED', 'OPEN', 'CLOSED'], to: 'PUBLISHED' },
    close: { from: ['PUBLISHED', 'OPEN'], to: 'CLOSED' },
    award: { from: ['PUBLISHED', 'OPEN', 'CLOSED'], to: 'AWARDED' },
  },
  supplierQuotation: {
    record: { from: null, to: 'SUBMITTED' },
    select: { from: ['SUBMITTED', 'VALID'], to: 'SELECTED' },
    autoRejectOthers: { from: ['SUBMITTED', 'VALID'], to: 'REJECTED' },
  },
  purchaseOrder: {
    create: { from: null, to: 'DRAFT' },
    submit: { from: ['DRAFT'], to: 'APPROVAL_PENDING' },
    approve: { from: ['APPROVAL_PENDING'], to: 'APPROVED' },
    send: { from: ['APPROVED'], to: 'SENT' },
    receivePartial: { from: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'], to: 'PARTIALLY_RECEIVED' },
    receiveFull: { from: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'], to: 'RECEIVED' },
    cancel: { from: ['DRAFT', 'APPROVAL_PENDING', 'APPROVED', 'SENT'], to: 'CANCELLED' },
  },
  goodsReceipt: {
    receive: { from: null, to: 'INSPECTION_PENDING' },
    accept: { from: ['RECEIVED', 'INSPECTION_PENDING'], to: 'ACCEPTED' },
    partiallyAccept: { from: ['RECEIVED', 'INSPECTION_PENDING'], to: 'PARTIALLY_ACCEPTED' },
    reject: { from: ['RECEIVED', 'INSPECTION_PENDING'], to: 'REJECTED' },
  },
} as const);

export const ProcurementAtomicityManifest = Object.freeze([
  'purchase-request-submit-status-plus-approval-plus-audit-plus-event',
  'purchase-request-approval-status-plus-approval-action-plus-audit-plus-event',
  'rfq-create-from-approved-pr-plus-pr-conversion-plus-audit',
  'supplier-quotation-selection-plus-other-quote-rejection-plus-rfq-award-plus-audit',
  'purchase-order-submit-status-plus-approval-plus-audit',
  'purchase-order-approval-status-plus-approval-action-plus-audit-plus-event',
  'goods-receipt-header-lines-plus-po-received-qty-plus-stock-ledger-plus-serial-batch-state-plus-audit-plus-event',
  'goods-receipt-inspection-plus-status-plus-audit',
] as const);

export const ProcurementNoAsyncCriticalMutationRule =
  'No purchase approval state, purchase order receiving quantity, inventory stock balance, stock ledger, serial movement or supplier-invoice matching source state may be moved to BullMQ or eventual consistency.' as const;
