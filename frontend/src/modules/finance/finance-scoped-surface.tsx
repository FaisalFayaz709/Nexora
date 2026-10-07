'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { DataTable } from '@/components/data';
import { ErrorState, LoadingState } from '@/components/feedback';
import { CommandFormDialog, type CommandFormDefinition } from '@/components/forms';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { ActivityTimeline, AuditTimeline, MakerCheckerNotice } from '@/components/workflow';
import { apiRequest, type ApiListEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { createEntityColumns, type EntityRow } from '@/modules/masters/columns';
import { agingColumns, bankAccountColumns, taxReportColumns } from './columns';
import { commandFromKey } from './finance-command-panel';
import { getFinanceCommandConfig, type FinanceScopedSurfaceConfig } from './finance-resource-config';
import {
  CloseBankReconciliationSchema,
  ImportBankStatementSchema,
  PaymentVoucherSchema,
  TaxCalculateSchema,
} from '@nexora/shared';
import { z } from 'zod';

function endpointFor(template: string, recordId: string) {
  return template.replace(':id', recordId);
}

function cast(schema: z.ZodTypeAny): z.ZodType<Record<string, unknown>> {
  return schema as z.ZodType<Record<string, unknown>>;
}

function shouldReadList(surface: FinanceScopedSurfaceConfig) {
  return ['ar-aging', 'ap-aging', 'tax-report', 'bank-cash'].includes(surface.key);
}

function listColumns(surface: FinanceScopedSurfaceConfig) {
  if (surface.key === 'bank-cash') return createEntityColumns(bankAccountColumns);
  if (surface.key === 'tax-report') return createEntityColumns(taxReportColumns);
  return createEntityColumns(agingColumns);
}

function formDefinition(surface: FinanceScopedSurfaceConfig, recordId: string): CommandFormDefinition<Record<string, unknown>> | null {
  if (!surface.command) return null;
  const command = getFinanceCommandConfig(surface.command);
  const endpoint = endpointFor(surface.endpointTemplate, recordId);
  if (surface.command === 'calculate-tax') return { commandKey: 'finance-calculate-tax', title: 'Calculate tax', description: 'Deterministic tax preview uses Fastify /api/v1/tax/calculate and does not rewrite historical tax snapshots.', endpoint, schema: cast(TaxCalculateSchema), defaultValues: { sourceType: 'PREVIEW', partyType: 'OTHER', transactionDate: '', lines: [] }, fields: [{ name: 'transactionDate', label: 'Transaction date', type: 'date' }, { name: 'lines', label: 'Tax lines', type: 'hidden', description: 'Controlled tax-line field array in final UI.' }], invalidateKeys: [createNexoraQueryKey('finance-tax')], idempotent: true, currentStatus: 'PREVIEW', requiredPermission: surface.requiredPermission, irreversibleEffects: [...command.irreversibleEffects] };
  if (surface.command === 'import-bank-statement') return { commandKey: 'finance-import-bank-statement', title: 'Import bank statement', description: 'Bank statement import sends validated statement lines to Fastify and does not create browser-only bank records.', endpoint, schema: cast(ImportBankStatementSchema), defaultValues: { bankAccountId: '', statementNo: '', periodStart: '', periodEnd: '', openingBalance: '0.00', closingBalance: '0.00', lines: [] }, fields: [{ name: 'bankAccountId', label: 'Bank account', type: 'text' }, { name: 'statementNo', label: 'Statement no', type: 'text' }, { name: 'periodStart', label: 'Period start', type: 'date' }, { name: 'periodEnd', label: 'Period end', type: 'date' }, { name: 'openingBalance', label: 'Opening balance', type: 'money' }, { name: 'closingBalance', label: 'Closing balance', type: 'money' }, { name: 'lines', label: 'Statement lines', type: 'hidden', description: 'Controlled line grid in final UI.' }], invalidateKeys: [createNexoraQueryKey('finance-bank')], idempotent: true, currentStatus: 'IMPORT_READY', requiredPermission: surface.requiredPermission, irreversibleEffects: [...command.irreversibleEffects] };
  if (surface.command === 'close-bank-reconciliation') return { commandKey: 'finance-close-bank-reconciliation', title: 'Close bank reconciliation', description: 'Closing reconciliation links payments, vouchers and journals through Fastify. Closed reconciliations cannot be silently edited.', endpoint, schema: cast(CloseBankReconciliationSchema), defaultValues: { journalEntryIds: [], paymentIds: [], voucherIds: [], closingNote: '' }, fields: [{ name: 'journalEntryIds', label: 'Journal entries', type: 'hidden' }, { name: 'paymentIds', label: 'Payments', type: 'hidden' }, { name: 'voucherIds', label: 'Vouchers', type: 'hidden' }, { name: 'closingNote', label: 'Closing note', type: 'textarea' }], invalidateKeys: [createNexoraQueryKey('finance-bank')], idempotent: true, currentStatus: 'IN_PROGRESS', requiredPermission: surface.requiredPermission, irreversibleEffects: [...command.irreversibleEffects] };
  if (surface.command === 'create-payment-voucher') return { commandKey: 'finance-payment-voucher', title: 'Create payment voucher', description: 'Payment voucher uses bank/cash funding-account exclusivity and backend audit/journal policy.', endpoint, schema: cast(PaymentVoucherSchema), defaultValues: { bankAccountId: '', cashAccountId: undefined, payeeType: 'VENDOR', payeeId: undefined, amount: '0.00', method: 'BANK_TRANSFER', voucherDate: '', memo: '', chequeNo: undefined }, fields: [{ name: 'bankAccountId', label: 'Bank account', type: 'text' }, { name: 'cashAccountId', label: 'Cash account', type: 'text' }, { name: 'payeeType', label: 'Payee type', type: 'select', options: [{ label: 'Vendor', value: 'VENDOR' }, { label: 'Customer', value: 'CUSTOMER' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Online', value: 'ONLINE' }] }, { name: 'voucherDate', label: 'Voucher date', type: 'text' }, { name: 'chequeNo', label: 'Cheque no', type: 'text' }, { name: 'memo', label: 'Memo', type: 'textarea' }], invalidateKeys: [createNexoraQueryKey('finance-bank')], idempotent: true, currentStatus: 'DRAFT', requiredPermission: surface.requiredPermission, irreversibleEffects: [...command.irreversibleEffects] };
  return { commandKey: `finance-${surface.command}`, title: surface.title, description: surface.description, endpoint, schema: cast(TaxCalculateSchema), defaultValues: {}, fields: [], invalidateKeys: [createNexoraQueryKey('finance')], idempotent: true, currentStatus: 'READY', requiredPermission: surface.requiredPermission, irreversibleEffects: [...surface.auditFocus] };
}

export function FinanceScopedSurface({ surface, recordId = 'context' }: { surface: FinanceScopedSurfaceConfig; recordId?: string }) {
  const endpoint = endpointFor(surface.endpointTemplate, recordId);
  const query = useQuery({
    queryKey: createNexoraQueryKey('finance-scoped-surface', surface.key, endpoint),
    enabled: shouldReadList(surface),
    queryFn: () => apiRequest<ApiListEnvelope<EntityRow>>(endpoint, { method: 'GET', query: { page: 1, pageSize: 25 } }),
  });
  const definition = useMemo(() => formDefinition(surface, recordId), [surface, recordId]);
  const commandFallback = surface.command ? commandFromKey(surface.command, surface.endpointTemplate, surface.title, surface.requiredPermission) : null;
  void commandFallback;

  if (query.isLoading) return <LoadingState title={`Loading ${surface.title}`} description="Fetching finance read model from the Fastify backend." />;
  if (query.error) return <ErrorState title={`Unable to load ${surface.title}`} description={query.error instanceof Error ? query.error.message : 'The finance read model request failed.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{surface.title}</CardTitle>
              <CardDescription>{surface.description}</CardDescription>
            </div>
            <Button type="button" variant="outline" asChild><a href="/finance/workbench">Back to Finance Workbench</a></Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint}</p>
        </CardHeader>
      </Card>

      <Tabs
        defaultId={definition ? 'command' : 'read-model'}
        items={[
          {
            id: 'read-model',
            label: 'Read model',
            content: shouldReadList(surface) ? (
              <DataTable<EntityRow, unknown>
                columns={listColumns(surface)}
                data={Array.isArray(query.data?.data) ? query.data.data : []}
                emptyTitle={`No ${surface.title.toLowerCase()} rows`}
                emptyDescription="The backend returned no rows for the current tenant/permission scope."
              />
            ) : (
              <Card><CardHeader><CardTitle className="text-base">Command-only surface</CardTitle><CardDescription>This screen exposes a command form and audit guidance without inventing a browser-only finance read model.</CardDescription></CardHeader></Card>
            ),
          },
          {
            id: 'command',
            label: 'Command',
            content: definition ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Command form</CardTitle><CardDescription>Submitted through centralized API client to Fastify /api/v1.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <MakerCheckerNotice>Finance command forms use React Hook Form, shared Zod and backend authorization. The frontend cannot bypass bank/cash, tax, reconciliation or journal rules.</MakerCheckerNotice>
                  <CommandFormDialog open={true} onOpenChange={() => undefined} definition={definition} />
                </CardContent>
              </Card>
            ) : (
              <Card><CardHeader><CardTitle className="text-base">No mutation allowed</CardTitle><CardDescription>This finance surface is read-only at frontend level.</CardDescription></CardHeader></Card>
            ),
          },
          {
            id: 'audit',
            label: 'Audit and controls',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Business continuity</CardTitle><CardDescription>Finance connects operations to reliable ledgers and reports.</CardDescription></CardHeader><CardContent><ActivityTimeline items={surface.auditFocus.map((item, index) => ({ id: `${surface.key}-${index}`, title: item, description: 'R15 finance frontend preserves backend authority and auditability.' }))} /></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Locked controls</CardTitle><CardDescription>High-risk effects stay transactional.</CardDescription></CardHeader><CardContent><AuditTimeline items={[{ id: 'tenant', title: 'Tenant and branch scope', description: 'Backend injects tenant context into finance queries and commands.' }, { id: 'reversal', title: 'Reversal-only correction', description: 'Posted money and journal effects cannot be silently overwritten.' }, { id: 'idempotency', title: 'Idempotency', description: 'Retry-sensitive commands use idempotency keys or command dedupe.' }]} /></CardContent></Card>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
