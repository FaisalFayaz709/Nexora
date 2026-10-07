'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
  CloseBankReconciliationSchema,
  CreateJournalEntrySchema,
  CreatePaymentSchema,
  EmptyCommandSchema,
  ImportBankStatementSchema,
  PaymentVoucherSchema,
  ReceiptVoucherSchema,
  TaxCalculateSchema,
} from '@nexora/shared';

import { CommandFormDialog, type CommandFormDefinition, type ResourceFormField } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { MakerCheckerNotice, StateTransitionPanel } from '@/components/workflow';
import { createNexoraQueryKey } from '@/lib/query-client';
import type { FinanceCommandConfig, FinanceCommandKey, FinanceResourceConfig } from './finance-resource-config';

function endpointFor(template: string, recordId: string) {
  return template.replace(':id', recordId);
}

function cast(schema: z.ZodTypeAny): z.ZodType<Record<string, unknown>> {
  return schema as z.ZodType<Record<string, unknown>>;
}

const uuidDescription = 'Select an existing record id from a controlled picker in the final finance UI; backend validates UUID, tenant, branch and permission scope.';
// R15 marker: React Hook Form + Zod finance command forms; posted invoices remain reversal controlled.

function schemaFor(command: FinanceCommandConfig) {
  switch (command.key) {
    case 'create-payment': return cast(CreatePaymentSchema);
    case 'post-journal-entry': return cast(EmptyCommandSchema);
    case 'calculate-tax': return cast(TaxCalculateSchema);
    case 'import-bank-statement': return cast(ImportBankStatementSchema);
    case 'close-bank-reconciliation': return cast(CloseBankReconciliationSchema);
    case 'create-payment-voucher': return cast(PaymentVoucherSchema);
    case 'create-receipt-voucher': return cast(ReceiptVoucherSchema);
    default: return cast(EmptyCommandSchema);
  }
}

function defaultsFor(command: FinanceCommandConfig): Record<string, unknown> {
  switch (command.key) {
    case 'create-payment': return { direction: 'INBOUND', partyType: 'CUSTOMER', partyId: '', amount: '0.00', method: 'BANK_TRANSFER', paidAt: '', allocations: [] };
    case 'calculate-tax': return { sourceType: 'PREVIEW', partyType: 'OTHER', transactionDate: '', lines: [] };
    case 'import-bank-statement': return { bankAccountId: '', statementNo: '', periodStart: '', periodEnd: '', openingBalance: '0.00', closingBalance: '0.00', lines: [] };
    case 'close-bank-reconciliation': return { journalEntryIds: [], paymentIds: [], voucherIds: [], closingNote: '' };
    case 'create-payment-voucher': return { bankAccountId: '', cashAccountId: undefined, payeeType: 'VENDOR', payeeId: undefined, amount: '0.00', method: 'BANK_TRANSFER', voucherDate: '', memo: '', chequeNo: undefined };
    case 'create-receipt-voucher': return { bankAccountId: '', cashAccountId: undefined, payerType: 'CUSTOMER', payerId: undefined, amount: '0.00', method: 'BANK_TRANSFER', voucherDate: '', memo: '', referenceNo: undefined };
    default: return {};
  }
}

function fieldsFor(command: FinanceCommandConfig): ResourceFormField[] {
  switch (command.key) {
    case 'create-payment': return [
      { name: 'direction', label: 'Direction', type: 'select', options: [{ label: 'Inbound', value: 'INBOUND' }, { label: 'Outbound', value: 'OUTBOUND' }] },
      { name: 'partyType', label: 'Party type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] },
      { name: 'partyId', label: 'Party', type: 'text', required: true, description: uuidDescription },
      { name: 'amount', label: 'Amount', type: 'money', required: true },
      { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Card', value: 'CARD' }, { label: 'Online', value: 'ONLINE' }] },
      { name: 'paidAt', label: 'Paid at', type: 'text', required: true },
      { name: 'allocations', label: 'Allocations', type: 'array', minItems: 1, description: 'Controlled payment allocation rows; backend enforces idempotency and amount reconciliation.', emptyItem: { invoiceType: 'CUSTOMER_INVOICE', invoiceId: '', amount: '0.00' }, arrayFields: [{ name: 'invoiceType', label: 'Invoice type', type: 'select', options: [{ label: 'Customer invoice', value: 'CUSTOMER_INVOICE' }, { label: 'Supplier invoice', value: 'SUPPLIER_INVOICE' }, { label: 'Expense', value: 'EXPENSE' }] }, { name: 'invoiceId', label: 'Invoice UUID', type: 'text', description: uuidDescription }, { name: 'amount', label: 'Amount', type: 'money' }] },
    ];
    case 'calculate-tax': return [
      { name: 'sourceType', label: 'Source type', type: 'select', options: [{ label: 'Preview', value: 'PREVIEW' }, { label: 'Customer invoice', value: 'CUSTOMER_INVOICE' }, { label: 'Supplier invoice', value: 'SUPPLIER_INVOICE' }, { label: 'Purchase order', value: 'PURCHASE_ORDER' }, { label: 'Expense', value: 'EXPENSE' }] },
      { name: 'partyType', label: 'Party type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] },
      { name: 'partyId', label: 'Party', type: 'text', description: uuidDescription },
      { name: 'transactionDate', label: 'Transaction date', type: 'date', required: true },
      { name: 'lines', label: 'Tax lines', type: 'array', minItems: 1, description: 'Controlled tax calculation rows; backend creates auditable tax snapshots.', emptyItem: { lineId: '', productId: '', description: '', quantity: '1.0000', unitPrice: '0.00', discount: '0.00', taxCodeId: '' }, arrayFields: [{ name: 'lineId', label: 'Line ref', type: 'text' }, { name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'description', label: 'Description', type: 'text' }, { name: 'quantity', label: 'Quantity', type: 'quantity' }, { name: 'unitPrice', label: 'Unit price', type: 'money' }, { name: 'discount', label: 'Discount', type: 'money' }, { name: 'taxCodeId', label: 'Tax code UUID', type: 'text', description: uuidDescription }] },
    ];
    case 'import-bank-statement': return [
      { name: 'bankAccountId', label: 'Bank account', type: 'text', required: true, description: uuidDescription },
      { name: 'statementNo', label: 'Statement no', type: 'text', required: true },
      { name: 'periodStart', label: 'Period start', type: 'date', required: true },
      { name: 'periodEnd', label: 'Period end', type: 'date', required: true },
      { name: 'openingBalance', label: 'Opening balance', type: 'money', required: true },
      { name: 'closingBalance', label: 'Closing balance', type: 'money', required: true },
      { name: 'lines', label: 'Statement lines', type: 'array', minItems: 1, description: 'Controlled bank statement rows for later matching and reconciliation.', emptyItem: { occurredAt: '', description: '', reference: '', debit: '0.00', credit: '0.00' }, arrayFields: [{ name: 'occurredAt', label: 'Occurred at', type: 'date' }, { name: 'description', label: 'Description', type: 'text' }, { name: 'reference', label: 'Reference', type: 'text' }, { name: 'debit', label: 'Debit', type: 'money' }, { name: 'credit', label: 'Credit', type: 'money' }] },
    ];
    case 'close-bank-reconciliation': return [
      { name: 'journalEntryIds', label: 'Journal entry IDs JSON', type: 'json', description: 'Array of journal-entry UUIDs to link.' },
      { name: 'paymentIds', label: 'Payment IDs JSON', type: 'json', description: 'Array of payment UUIDs to link.' },
      { name: 'voucherIds', label: 'Voucher IDs JSON', type: 'json', description: 'Array of payment/receipt voucher UUIDs to link.' },
      { name: 'closingNote', label: 'Closing note', type: 'textarea' },
    ];
    case 'create-payment-voucher': return [
      { name: 'bankAccountId', label: 'Bank account', type: 'text', description: uuidDescription },
      { name: 'cashAccountId', label: 'Cash account', type: 'text', description: uuidDescription },
      { name: 'payeeType', label: 'Payee type', type: 'select', options: [{ label: 'Vendor', value: 'VENDOR' }, { label: 'Customer', value: 'CUSTOMER' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] },
      { name: 'payeeId', label: 'Payee', type: 'text', description: uuidDescription },
      { name: 'amount', label: 'Amount', type: 'money', required: true },
      { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Online', value: 'ONLINE' }] },
      { name: 'voucherDate', label: 'Voucher date', type: 'text', required: true },
      { name: 'chequeNo', label: 'Cheque no', type: 'text' },
      { name: 'memo', label: 'Memo', type: 'textarea' },
    ];
    case 'create-receipt-voucher': return [
      { name: 'bankAccountId', label: 'Bank account', type: 'text', description: uuidDescription },
      { name: 'cashAccountId', label: 'Cash account', type: 'text', description: uuidDescription },
      { name: 'payerType', label: 'Payer type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] },
      { name: 'payerId', label: 'Payer', type: 'text', description: uuidDescription },
      { name: 'amount', label: 'Amount', type: 'money', required: true },
      { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Online', value: 'ONLINE' }] },
      { name: 'voucherDate', label: 'Voucher date', type: 'text', required: true },
      { name: 'referenceNo', label: 'Reference no', type: 'text' },
      { name: 'memo', label: 'Memo', type: 'textarea' },
    ];
    default: return [];
  }
}

function definitionFor(resource: FinanceResourceConfig, recordId: string, command: FinanceCommandConfig): CommandFormDefinition<Record<string, unknown>> {
  return {
    commandKey: `finance-${resource.key}-${command.key}`,
    title: command.label,
    description: `${command.label} is submitted to the locked Fastify endpoint ${endpointFor(command.endpointTemplate, recordId)}. No Next.js business API owns finance, tax, bank or journal logic.`,
    endpoint: endpointFor(command.endpointTemplate, recordId),
    schema: schemaFor(command),
    defaultValues: defaultsFor(command),
    fields: fieldsFor(command),
    invalidateKeys: [
      createNexoraQueryKey('finance', resource.key),
      createNexoraQueryKey('finance-detail', resource.key, recordId),
      createNexoraQueryKey('frontend-grid', resource.endpoint),
      createNexoraQueryKey('finance-aging'),
    ],
    idempotent: command.idempotent,
    currentStatus: command.allowedStates.join(' / '),
    requiredPermission: command.requiredPermission,
    irreversibleEffects: [...command.irreversibleEffects],
  };
}

export function FinanceCommandPanel({ resource, recordId, currentStatus = 'UNKNOWN' }: { resource: FinanceResourceConfig; recordId: string; currentStatus?: string }) {
  const [activeCommand, setActiveCommand] = useState<FinanceCommandConfig | null>(null);
  const commandDefinitions = useMemo(() => resource.commands.map((command) => definitionFor(resource, recordId, command)), [resource, recordId]);

  return (
    <div className="space-y-4">
      <MakerCheckerNotice>Finance commands remain backend-authoritative for invoice status, tax snapshots, payment allocations, journal postings, bank reconciliation, tenant scope and audit.</MakerCheckerNotice>
      <StateTransitionPanel
        currentStatus={currentStatus}
        title={`${resource.singularTitle} finance workflow commands`}
        description="Finance lifecycle changes use explicit Fastify command endpoints. Status cannot be freely patched from generic edit forms."
        actions={resource.commands.map((command) => ({ id: command.key, label: command.label, permission: command.requiredPermission, destructive: command.destructive, onSelect: () => setActiveCommand(command) }))}
      />
      <Card>
        <CardHeader><CardTitle className="text-base">R15 finance transaction rules</CardTitle><CardDescription>Money, tax, allocations and journal state are always committed by backend services.</CardDescription></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Posted invoices, payments, journal entries and closed reconciliations cannot be silently edited from the frontend.</li>
            <li>Supplier invoice approval depends on a backend three-way match: Purchase Order + Goods Received Note + Supplier Invoice.</li>
            <li>Payment and voucher submission uses idempotency and backend allocation/reconciliation rules, including payment/receipt voucher collection or disbursement proof.</li>
          </ul>
        </CardContent>
      </Card>
      {resource.commands.map((command, index) => (
        <CommandFormDialog key={command.key} open={activeCommand?.key === command.key} onOpenChange={(open) => { if (!open) setActiveCommand(null); }} definition={commandDefinitions[index]!} />
      ))}
    </div>
  );
}

export function FinanceStandaloneCommandForm({ command, recordId = 'context' }: { command: FinanceCommandConfig; recordId?: string }) {
  const resource = {
    key: 'journal-entries', title: 'Finance Command', singularTitle: 'Finance Command', routeBase: '/finance/workbench', endpoint: command.endpointTemplate.replace('/:id', ''),
    viewPermission: command.requiredPermission, listSupported: false, detailSupported: false, editSupported: false, createSupported: false,
    description: 'Standalone finance command form.', columns: [], identityFields: [], profileFields: [], relatedPanels: [], commands: [command],
  } satisfies FinanceResourceConfig;
  const [open, setOpen] = useState(true);
  const definition = useMemo(() => definitionFor(resource, recordId, command), [resource, recordId, command]);
  return <CommandFormDialog open={open} onOpenChange={setOpen} definition={definition} />;
}

export function commandFromKey(key: FinanceCommandKey, endpointTemplate: string, label: string, permission: string): FinanceCommandConfig {
  return { key, label, endpointTemplate, requiredPermission: permission as never, idempotent: true, allowedStates: ['COMMAND_READY'], irreversibleEffects: ['Fastify service validates permission, tenant, branch, state and audit policy.'] };
}
