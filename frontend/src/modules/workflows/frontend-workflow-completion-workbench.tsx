'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  C15_FRONTEND_WORKFLOW_COMPLETION,
  FrontendWorkflowCommandCatalog,
  FrontendWorkflowCompletionManifest,
  FrontendWorkflowReadModels,
  type FrontendWorkflowCommand,
} from '@nexora/shared';
import { apiRequest } from '@/lib/api-client';
import { useAuth } from '../auth/auth-provider';
import {
  assertM18CommandExecutionGuard,
  buildM18CommandHeaders,
  resolveM18CommandGate,
  type FrontendCommandGateDecision,
} from './frontend-runtime-completion-policy';

type WorkflowInputKey =
  | 'customerId'
  | 'vendorId'
  | 'projectId'
  | 'billOfMaterialsId'
  | 'purchaseRequestId'
  | 'rfqId'
  | 'supplierQuotationId'
  | 'purchaseOrderId'
  | 'goodsReceiptId'
  | 'supplierInvoiceId'
  | 'customerInvoiceId'
  | 'paymentId'
  | 'stockTransferId'
  | 'stockAdjustmentId'
  | 'assetId'
  | 'workOrderId'
  | 'maintenanceScheduleId'
  | 'importBatchId'
  | 'reportId';

type WorkflowInputs = Record<WorkflowInputKey, string>;

type CommandResult = {
  readonly commandId: string;
  readonly endpoint: string;
  readonly response: unknown;
};

const inputLabels: readonly [WorkflowInputKey, string][] = [
  ['customerId', 'Customer ID'],
  ['vendorId', 'Vendor ID'],
  ['projectId', 'Project ID'],
  ['billOfMaterialsId', 'BOM ID'],
  ['purchaseRequestId', 'Purchase Request ID'],
  ['rfqId', 'RFQ ID'],
  ['supplierQuotationId', 'Supplier Quotation ID'],
  ['purchaseOrderId', 'Purchase Order ID'],
  ['goodsReceiptId', 'Goods Receipt ID'],
  ['supplierInvoiceId', 'Supplier Invoice ID'],
  ['customerInvoiceId', 'Customer Invoice ID'],
  ['paymentId', 'Payment ID'],
  ['stockTransferId', 'Stock Transfer ID'],
  ['stockAdjustmentId', 'Stock Adjustment ID'],
  ['assetId', 'Asset ID'],
  ['workOrderId', 'Work Order ID'],
  ['maintenanceScheduleId', 'Maintenance Schedule ID'],
  ['importBatchId', 'Import Batch ID'],
  ['reportId', 'Report ID'],
] as const;

const initialInputs: WorkflowInputs = Object.fromEntries(inputLabels.map(([key]) => [key, ''])) as WorkflowInputs;

const stages = [
  {
    key: 'CRM_AND_PROJECT_START',
    title: '1. CRM and Project Start',
    description: 'Create customer/site, qualify opportunity, quotation acceptance, contract and project start through normal module pages.',
    links: ['/customers', '/site-surveys', '/quotations', '/contracts', '/projects'],
  },
  {
    key: 'PROJECT_BOM_AND_MATERIAL_REQUIREMENT',
    title: '2. Project BOM and Material Requirement',
    description: 'Approve BOM, compare inventory availability and generate material requests without bypassing project permissions.',
    links: ['/projects/delivery', '/projects', '/project-tasks'],
  },
  {
    key: 'PROCUREMENT_RFQ_PO_GRN',
    title: '3. Procurement RFQ, PO and GRN',
    description: 'Submit/approve PR, create RFQ, invite vendors, select quotation, approve/send PO and receive/inspect goods.',
    links: ['/procurement/workflow', '/procurement/purchase-requests', '/procurement/rfqs', '/procurement/purchase-orders', '/procurement/goods-receipts'],
  },
  {
    key: 'INVENTORY_STOCK_SERIAL_BATCH',
    title: '4. Inventory Stock, Serials and Batch/Lot',
    description: 'Review balances, immutable stock ledger, reservations, transfers, adjustments and serial lookup.',
    links: ['/inventory', '/inventory/stock', '/inventory/ledger', '/inventory/transfers', '/inventory/adjustments', '/inventory/serials'],
  },
  {
    key: 'ASSET_INSTALLATION_QR_WARRANTY',
    title: '5. Asset Installation, QR and Warranty',
    description: 'Install serialized equipment, rotate QR safely, track warranty/RMA and asset lifecycle history.',
    links: ['/assets/lifecycle', '/assets'],
  },
  {
    key: 'FIELD_SERVICE_AND_MAINTENANCE',
    title: '6. Field Service and Maintenance',
    description: 'Assign technician, update work order status, submit service report, consume parts and generate maintenance work orders.',
    links: ['/service/field-operations', '/work-orders', '/tickets', '/maintenance/workbench', '/maintenance-schedule'],
  },
  {
    key: 'FINANCE_MATCH_POST_PAY',
    title: '7. Finance Match, Post and Pay',
    description: 'Run supplier three-way match, post invoices, allocate payments and preserve reversal-only ledger controls.',
    links: ['/finance/workbench', '/customer-invoices', '/supplier-invoices', '/payments'],
  },
  {
    key: 'DOCUMENTS_REPORTS_PORTALS',
    title: '8. Documents, Reports and Portals',
    description: 'Use upload intent for evidence, export reports through queues, and keep customer/vendor/technician surfaces scoped.',
    links: ['/documents-notifications', '/reports-workbench', '/portals', '/customer-portal', '/vendor-portal', '/technician-pwa'],
  },
] as const;

function fillTemplate(template: string, inputs: WorkflowInputs) {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (_, rawKey: string) => {
    const key = rawKey as WorkflowInputKey;
    return inputs[key] || `{${rawKey}}`;
  });
}

function fillPayload(value: unknown, inputs: WorkflowInputs): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{([a-zA-Z0-9]+)\}/g, (_, rawKey: string) => {
      const key = rawKey as WorkflowInputKey;
      return inputs[key] || `{${rawKey}}`;
    });
  }
  if (Array.isArray(value)) return value.map((item) => fillPayload(item, inputs));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillPayload(item, inputs)]));
  }
  return value;
}

function CommandCard({
  command,
  inputs,
  payloadText,
  setPayloadText,
  onRun,
  running,
  gateDecision,
}: {
  command: FrontendWorkflowCommand;
  inputs: WorkflowInputs;
  payloadText: string;
  setPayloadText: (value: string) => void;
  onRun: (command: FrontendWorkflowCommand, payloadText: string) => void;
  running: boolean;
  gateDecision: FrontendCommandGateDecision;
}) {
  const endpoint = fillTemplate(command.endpointTemplate, inputs);
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">{command.label}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">{command.method} {endpoint}</p>
        </div>
        <span className={command.destructiveOrHighRisk ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700' : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700'}>
          {command.destructiveOrHighRisk ? 'confirmation' : 'standard'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
        <div><b>Permission:</b> {command.requiredPermission}</div>
        <div><b>Status gate:</b> {command.requiredStatus.join(', ') || 'service controlled'}</div>
        <div><b>Idempotency:</b> {command.requiresIdempotencyKey ? 'required' : 'not required'}</div>
        <div><b>Invalidates:</b> {command.invalidates.join(', ')}</div>
      </div>
      <label className="mt-4 block text-xs font-medium text-slate-600">
        JSON payload
        <textarea
          className="mt-1 min-h-28 w-full rounded-xl border p-3 font-mono text-xs"
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
        />
      </label>
      <button
        className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={running || !gateDecision.allowed}
        onClick={() => onRun(command, payloadText)}
      >
        {running ? 'Running…' : gateDecision.allowed ? 'Run guarded command' : 'Blocked by M18 gate'}
      </button>
      {!gateDecision.allowed ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {gateDecision.reasons.map((reason) => <div key={reason}>{reason}</div>)}
        </div>
      ) : null}
    </article>
  );
}

function ReadModelPanel({ endpoint }: { endpoint: string }) {
  const query = useQuery({
    queryKey: ['c15-read-model', endpoint],
    queryFn: () => apiRequest<any>(endpoint),
    retry: false,
  });

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="font-mono text-xs text-slate-500">GET {endpoint}</h3>
      <pre className="mt-3 max-h-52 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
        {query.isLoading ? 'Loading…' : JSON.stringify(query.data?.data ?? query.error ?? [], null, 2)}
      </pre>
    </section>
  );
}

export function FrontendWorkflowCompletionWorkbench() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [inputs, setInputs] = useState<WorkflowInputs>(initialInputs);
  const [idempotencyKey, setIdempotencyKey] = useState(`c15-${Date.now()}`);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('PROCUREMENT_RFQ_PO_GRN');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [payloads, setPayloads] = useState<Record<string, string>>(() => Object.fromEntries(
    FrontendWorkflowCommandCatalog.map((command) => [command.id, JSON.stringify(command.defaultPayload, null, 2)]),
  ));

  const selectedCommands = useMemo(
    () => FrontendWorkflowCommandCatalog.filter((command) => command.stage === selectedStage),
    [selectedStage],
  );

  const mutation = useMutation({
    mutationFn: async ({ command, payloadText }: { command: FrontendWorkflowCommand; payloadText: string }) => {
      const endpoint = fillTemplate(command.endpointTemplate, inputs);
      assertM18CommandExecutionGuard(command, {
        permissions: auth.permissions,
        endpointResolved: !endpoint.includes('{'),
        confirmed,
        idempotencyKey,
      });
      if (command.destructiveOrHighRisk && !confirmed) {
        throw new Error('C15-DESTRUCTIVE-HIGH-RISK-ACTIONS-REQUIRE-EXPLICIT-CONFIRMATION: tick confirmation before running this action.');
      }
      if (endpoint.includes('{')) {
        throw new Error('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE: fill all required IDs before running command.');
      }
      let parsedPayload: unknown = {};
      if (payloadText.trim()) parsedPayload = JSON.parse(payloadText) as unknown;
      const body = command.method === 'DELETE' ? undefined : JSON.stringify(fillPayload(parsedPayload, inputs));
      const headers = buildM18CommandHeaders(command, idempotencyKey);
      const response = await apiRequest<unknown>(endpoint, { method: command.method, headers, body });
      return { commandId: command.id, endpoint, response } satisfies CommandResult;
    },
    onSuccess: async (result, variables) => {
      setLastResult(result);
      await Promise.all(variables.command.invalidates.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      await queryClient.invalidateQueries({ queryKey: ['c15-read-model'] });
    },
  });

  return (
    <div className="space-y-8" data-pass={C15_FRONTEND_WORKFLOW_COMPLETION}>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pass C15</p>
        <h1 className="text-3xl font-bold text-slate-900">Frontend Workflow Completion</h1>
        <p className="mt-2 max-w-5xl text-slate-600">
          This workbench turns the earlier module pages into one guarded end-to-end ERP workflow surface. It calls public API command endpoints only, carries idempotency keys on retry-sensitive actions, invalidates TanStack Query caches after mutations, and keeps stock, money and approval effects inside backend service transactions.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Locked C15 controls</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {FrontendWorkflowCompletionManifest.controls.map((control) => (
            <div key={control} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{control}</div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Workflow IDs and command safety</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {inputLabels.map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-slate-600">
              {label}
              <input
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                value={inputs[key]}
                onChange={(event) => setInputs((current) => ({ ...current, [key]: event.target.value }))}
                placeholder="uuid"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Idempotency-Key for guarded commands
            <input className="mt-1 w-full rounded-lg border p-2 text-sm" value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
          </label>
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I confirm high-risk workflow actions before execution.
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {stages.map((stage) => (
          <button
            key={stage.key}
            className={`rounded-2xl border p-4 text-left shadow-sm ${selectedStage === stage.key ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-blue-300'}`}
            onClick={() => setSelectedStage(stage.key)}
          >
            <h2 className="font-semibold text-slate-900">{stage.title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">{stage.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stage.links.map((link) => <span key={link} className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">{link}</span>)}
            </div>
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {selectedCommands.map((command) => {
          const endpoint = fillTemplate(command.endpointTemplate, inputs);
          const gateDecision = resolveM18CommandGate(command, {
            permissions: auth.permissions,
            endpointResolved: !endpoint.includes('{'),
            confirmed,
            idempotencyKey,
          });
          return (
            <CommandCard
              key={command.id}
              command={command}
              inputs={inputs}
              payloadText={payloads[command.id] ?? '{}'}
              setPayloadText={(value) => setPayloads((current) => ({ ...current, [command.id]: value }))}
              onRun={(cmd, payloadText) => mutation.mutate({ command: cmd, payloadText })}
              running={mutation.isPending}
              gateDecision={gateDecision}
            />
          );
        })}
      </section>

      {mutation.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(mutation.error)}</div> : null}
      {lastResult ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Last command result</h2>
          <p className="mt-1 font-mono text-xs text-slate-500">{lastResult.commandId} → {lastResult.endpoint}</p>
          <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(lastResult.response, null, 2)}</pre>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Connected read models</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {FrontendWorkflowReadModels.map((endpoint) => <ReadModelPanel key={endpoint} endpoint={endpoint} />)}
        </div>
      </section>
    </div>
  );
}
