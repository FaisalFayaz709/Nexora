'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
  AllocateLandedCostSchema,
  ApprovePurchaseContractSchema,
  CancelPurchaseOrderSchema,
  CreatePurchaseReleaseOrderSchema,
  CreateRfqFromPurchaseRequestSchema,
  EmptyCommandSchema,
  InspectGoodsReceiptSchema,
  InviteVendorsSchema,
  PostLandedCostSchema,
  PurchaseOrderCommandSchema,
  PurchaseRequestCommandSchema,
  ReceiveGoodsCommandSchema,
  RejectPurchaseRequestSchema,
  SelectQuotationSchema,
  VendorOnboardingActionSchema,
} from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { ProcurementCommandConfig, ProcurementResourceConfig } from './procurement-resource-config';

const CommandNoteSchema = z.object({ comment: z.string().max(2000).optional() });
const EmptyWithOptionalNoteSchema = z.object({ note: z.string().max(2000).optional() });


const goodsReceiptItemFields: ResourceFormField[] = [
  { name: 'purchaseOrderItemId', label: 'PO item', type: 'text', required: true, description: 'Use the locked PO item id. A picker can be layered on top without bypassing the shared Zod contract.' },
  { name: 'receivedQty', label: 'Received quantity', type: 'quantity', required: true },
  { name: 'acceptedQty', label: 'Accepted quantity', type: 'quantity', required: true },
  { name: 'damagedQty', label: 'Damaged quantity', type: 'quantity', required: true },
  { name: 'serialNumbers', label: 'Serial numbers JSON', type: 'json', description: 'Use a JSON array such as ["SN1001", "SN1002"].' },
  { name: 'batches', label: 'Batch/lot JSON', type: 'json', description: 'Use a JSON array of batch objects when the product is batch tracked.' },
];



const purchaseReleaseOrderItemFields: ResourceFormField[] = [
  { name: 'contractItemId', label: 'Contract item', type: 'text', required: true, description: 'UUID of the approved contract line being consumed.' },
  { name: 'quantity', label: 'Release quantity', type: 'quantity', required: true },
];

const landedCostAllocationFields: ResourceFormField[] = [
  { name: 'goodsReceiptItemId', label: 'GRN item', type: 'text', required: true, description: 'UUID of the receipt line receiving landed cost.' },
  { name: 'productId', label: 'Product', type: 'text', required: true, description: 'Product UUID from the receipt line.' },
  { name: 'warehouseId', label: 'Warehouse', type: 'text', required: true, description: 'Warehouse UUID receiving valuation impact.' },
  { name: 'quantity', label: 'Quantity', type: 'quantity', required: true },
  { name: 'allocatedAmount', label: 'Allocated amount', type: 'money', required: true },
];


function castCommandSchema(schema: z.ZodTypeAny): z.ZodType<Record<string, unknown>> {
  return schema as z.ZodType<Record<string, unknown>>;
}

function commandSchema(commandKey: string): z.ZodType<Record<string, unknown>> {
  if (commandKey === 'approve-purchase-request') return castCommandSchema(PurchaseRequestCommandSchema);
  if (commandKey === 'reject-purchase-request') return castCommandSchema(RejectPurchaseRequestSchema);
  if (commandKey === 'create-rfq-from-purchase-request') return castCommandSchema(CreateRfqFromPurchaseRequestSchema);
  if (commandKey === 'invite-vendors') return castCommandSchema(InviteVendorsSchema);
  if (commandKey === 'select-supplier-quotation') return castCommandSchema(SelectQuotationSchema);
  if (commandKey === 'submit-purchase-order' || commandKey === 'approve-purchase-order' || commandKey === 'send-purchase-order') return castCommandSchema(PurchaseOrderCommandSchema);
  if (commandKey === 'cancel-purchase-order') return castCommandSchema(CancelPurchaseOrderSchema);
  if (commandKey === 'receive-goods-for-po') return castCommandSchema(ReceiveGoodsCommandSchema);
  if (commandKey === 'inspect-goods-receipt') return castCommandSchema(InspectGoodsReceiptSchema);
  if (commandKey === 'approve-purchase-contract') return castCommandSchema(ApprovePurchaseContractSchema);
  if (commandKey === 'create-purchase-release-order') return castCommandSchema(CreatePurchaseReleaseOrderSchema);
  if (commandKey === 'allocate-landed-cost') return castCommandSchema(AllocateLandedCostSchema);
  if (commandKey === 'post-landed-cost') return castCommandSchema(PostLandedCostSchema);
  if (commandKey === 'approve-vendor-onboarding') return castCommandSchema(VendorOnboardingActionSchema);
  if (commandKey === 'submit-purchase-request') return castCommandSchema(CommandNoteSchema);
  if (commandKey === 'publish-rfq' || commandKey === 'close-rfq' || commandKey === 'submit-vendor-onboarding') return castCommandSchema(EmptyCommandSchema);
  return castCommandSchema(EmptyWithOptionalNoteSchema);
}

function commandDefaults(command: ProcurementCommandConfig, recordId: string): Record<string, unknown> {
  if (command.key === 'approve-purchase-request') return { comment: '' };
  if (command.key === 'reject-purchase-request') return { comment: '' };
  if (command.key === 'create-rfq-from-purchase-request') return { closesAt: '' };
  if (command.key === 'invite-vendors') return { vendorIds: [] };
  if (command.key === 'select-supplier-quotation') return { comment: '' };
  if (command.key === 'submit-purchase-order' || command.key === 'approve-purchase-order' || command.key === 'send-purchase-order') return { comment: '' };
  if (command.key === 'cancel-purchase-order') return { reason: '' };
  if (command.key === 'receive-goods-for-po') return { purchaseOrderId: recordId, warehouseId: '', receivedAt: '', items: [] };
  if (command.key === 'inspect-goods-receipt') return { result: 'ACCEPTED', notes: '' };
  if (command.key === 'approve-purchase-contract') return { comment: '' };
  if (command.key === 'create-purchase-release-order') return { expectedDate: '', notes: '', items: [] };
  if (command.key === 'allocate-landed-cost') return { allocations: [] };
  if (command.key === 'post-landed-cost') return { postingDate: '' };
  if (command.key === 'approve-vendor-onboarding') return { decision: 'APPROVE', comment: '', documentsVerified: false, bankVerified: false, riskScore: 0, riskRating: 'LOW', approvedCategoryIds: [], blacklistReason: '' };
  if (command.key === 'blacklist-vendor') return { reason: '', riskScore: 100 };
  return {};
}

function commandFields(command: ProcurementCommandConfig): ResourceFormField[] {
  if (command.key === 'approve-purchase-request') return [{ name: 'comment', label: 'Approval comment', type: 'textarea', required: true }];
  if (command.key === 'reject-purchase-request') return [{ name: 'comment', label: 'Rejection reason', type: 'textarea', required: true }];
  if (command.key === 'create-rfq-from-purchase-request') return [{ name: 'closesAt', label: 'RFQ closes at', type: 'text', required: true, description: 'ISO datetime. Backend validates that the PR is approved before RFQ creation.' }];
  if (command.key === 'invite-vendors') return [{ name: 'vendorIds', label: 'Approved vendor ids JSON', type: 'json', description: 'Use a JSON array of approved vendor UUIDs. Backend still enforces approved/blacklisted vendor rules.' }];
  if (command.key === 'select-supplier-quotation') return [{ name: 'comment', label: 'Selection comment', type: 'textarea' }];
  if (command.key === 'submit-purchase-order' || command.key === 'approve-purchase-order' || command.key === 'send-purchase-order') return [{ name: 'comment', label: 'Command comment', type: 'textarea' }];
  if (command.key === 'cancel-purchase-order') return [{ name: 'reason', label: 'Cancellation reason', type: 'textarea', required: true }];
  if (command.key === 'receive-goods-for-po') return [
    { name: 'purchaseOrderId', label: 'Purchase order', type: 'text', required: true },
    { name: 'warehouseId', label: 'Receiving warehouse', type: 'text', required: true, description: 'Full implementation uses a warehouse picker scoped by tenant/branch.' },
    { name: 'receivedAt', label: 'Received at', type: 'text', required: true },
    { name: 'items', label: 'Received line items', type: 'array', description: 'Controlled RHF line array: purchaseOrderItemId, receivedQty, acceptedQty, damagedQty, serials and batches. The backend still validates PO line ownership, tolerance, serial count and stock ledger atomicity.', arrayFields: goodsReceiptItemFields, emptyItem: { purchaseOrderItemId: '', receivedQty: '1', acceptedQty: '1', damagedQty: '0', serialNumbers: [], batches: [] }, minItems: 1 },
  ];
  if (command.key === 'inspect-goods-receipt') return [
    { name: 'result', label: 'Inspection result', type: 'select', required: true, options: [{ label: 'Accepted', value: 'ACCEPTED' }, { label: 'Partially accepted', value: 'PARTIALLY_ACCEPTED' }, { label: 'Rejected', value: 'REJECTED' }] },
    { name: 'notes', label: 'Inspection notes', type: 'textarea' },
  ];
  if (command.key === 'approve-purchase-contract') return [{ name: 'comment', label: 'Approval comment', type: 'textarea' }];
  if (command.key === 'create-purchase-release-order') return [
    { name: 'expectedDate', label: 'Expected date', type: 'date', required: true },
    { name: 'notes', label: 'Release notes', type: 'textarea' },
    { name: 'items', label: 'Release lines', type: 'array', description: 'Controlled RHF release lines. Backend validates contract ownership, active status and remaining quantity/value before consuming balances.', arrayFields: purchaseReleaseOrderItemFields, emptyItem: { contractItemId: '', quantity: '1' }, minItems: 1 },
  ];
  if (command.key === 'allocate-landed-cost') return [{ name: 'allocations', label: 'Allocation lines', type: 'array', description: 'Controlled RHF allocation lines. Backend requires allocated amount to reconcile exactly to landed-cost total before posting.', arrayFields: landedCostAllocationFields, emptyItem: { goodsReceiptItemId: '', productId: '', warehouseId: '', quantity: '1', allocatedAmount: '0.00' }, minItems: 1 }];
  if (command.key === 'post-landed-cost') return [{ name: 'postingDate', label: 'Posting date', type: 'date' }];
  if (command.key === 'approve-vendor-onboarding') return [
    { name: 'decision', label: 'Decision', type: 'select', options: [{ label: 'Approve', value: 'APPROVE' }, { label: 'Blacklist', value: 'BLACKLIST' }] },
    { name: 'documentsVerified', label: 'Documents verified', type: 'checkbox' },
    { name: 'bankVerified', label: 'Bank details verified', type: 'checkbox' },
    { name: 'riskScore', label: 'Risk score', type: 'number' },
    { name: 'riskRating', label: 'Risk rating', type: 'select', options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Blacklisted', value: 'BLACKLISTED' }] },
    { name: 'comment', label: 'Decision comment', type: 'textarea' },
    { name: 'blacklistReason', label: 'Blacklist reason', type: 'textarea' },
  ];
  if (command.key === 'blacklist-vendor') return [{ name: 'reason', label: 'Risk reason', type: 'textarea', required: true }, { name: 'riskScore', label: 'Risk score', type: 'number' }];
  return [{ name: 'note', label: 'Command note', type: 'textarea' }];
}

function endpointFor(command: ProcurementCommandConfig, recordId: string) {
  if (command.prefillRecordIdField && !command.endpointTemplate.includes(':id')) return command.endpointTemplate;
  return command.endpointTemplate.replace(':id', recordId);
}

export function createProcurementCommandDefinition(
  resource: ProcurementResourceConfig,
  command: ProcurementCommandConfig,
  recordId: string,
): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: `procurement-${resource.key}-${command.key}`,
    title: command.label,
    description: `${resource.singularTitle} workflow command. It is status-aware, permission-gated and submitted to the locked Fastify endpoint ${endpointFor(command, recordId)}.`,
    endpoint: endpointFor(command, recordId),
    schema: commandSchema(command.key),
    defaultValues: commandDefaults(command, recordId),
    fields: commandFields(command),
    invalidateKeys: [
      createNexoraQueryKey('procurement', resource.key),
      createNexoraQueryKey('procurement-detail', resource.key, recordId),
      createNexoraQueryKey('frontend-grid', resource.endpoint),
      createNexoraQueryKey('procurement-workflow', 'rfq-po-grn'),
    ],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function ProcurementCommandPanel({ resource, recordId, currentStatus = 'UNKNOWN' }: { resource: ProcurementResourceConfig; recordId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<ProcurementCommandConfig | null>(null);
  const commandDefinitions = useMemo(
    () => resource.commands.map((command) => createProcurementCommandDefinition(resource, command, recordId)),
    [resource, recordId],
  );

  if (!resource.commands.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow commands</CardTitle>
          <CardDescription>This procurement surface has no direct command actions. It remains tied to upstream/downstream records through the workflow tabs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create/edit screens are available only where the locked backend exposes create/edit contracts. Status transitions use command endpoints only.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Procurement commands remain backend-authoritative for tenant, branch, status, vendor risk, maker-checker, inventory, finance and audit rules.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title="Procurement command panel"
        description="Only explicit command endpoints can move the PR/RFQ/quotation/PO/GRN/contract/landed-cost lifecycle. Status is never freely PATCHed from an edit form."
        actions={resource.commands.map((command) => ({
          id: command.key,
          label: command.label,
          permission: command.requiredPermission,
          destructive: command.destructive,
          onSelect: () => setActiveCommand(command),
        }))}
      />
      {resource.commands.map((command, index) => (
        <CommandFormDialog
          key={command.key}
          open={activeCommand?.key === command.key}
          onOpenChange={(open) => { if (!open) setActiveCommand(null); }}
          definition={commandDefinitions[index]!}
        />
      ))}
    </div>
  );
}
