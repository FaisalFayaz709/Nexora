'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CommitImportSchema, ImportUploadSchema, RollbackImportSchema, ValidateImportSchema } from '@nexora/shared';
import { z } from 'zod';

import { createIdempotencyKey } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { commitImportBatch, rollbackImportBatch, uploadImportBatch, validateImportBatch } from './api';
import { ErrorState } from '@/components/feedback';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs } from '@/components/ui';
import { FormSection, FormShell, ResourceFormFields } from '@/components/forms';

const ImportBatchCommandIdSchema = z.object({ importBatchId: z.string().min(1, 'Import batch id is required') });
const ImportRowsJsonSchema = z.object({
  mappingJson: z.string().optional(),
  rowsJson: z.string().min(2, 'Paste at least one parsed row as JSON before validation'),
});
const UploadImportFormSchema = ImportUploadSchema;
const ValidateImportFormSchema = ValidateImportSchema.omit({ mapping: true, rows: true }).merge(ImportBatchCommandIdSchema).merge(ImportRowsJsonSchema);
const CommitImportFormSchema = CommitImportSchema.merge(ImportBatchCommandIdSchema);
const RollbackImportFormSchema = RollbackImportSchema.merge(ImportBatchCommandIdSchema);

type UploadImportForm = z.infer<typeof UploadImportFormSchema>;
type ValidateImportForm = z.infer<typeof ValidateImportFormSchema>;
type CommitImportForm = z.infer<typeof CommitImportFormSchema>;
type RollbackImportForm = z.infer<typeof RollbackImportFormSchema>;

const importTemplates = [
  { subjectType: 'EMPLOYEE', label: 'Employees', required: 'employeeNo, name, branchId, departmentId' },
  { subjectType: 'CUSTOMER', label: 'Customers', required: 'code, name' },
  { subjectType: 'VENDOR', label: 'Vendors', required: 'code, name' },
  { subjectType: 'PRODUCT', label: 'Products', required: 'sku, name, categoryId, unitId, trackingType' },
  { subjectType: 'WAREHOUSE', label: 'Warehouses', required: 'branchId, code, name' },
  { subjectType: 'INVENTORY', label: 'Opening stock', required: 'warehouseId, productId, onHand' },
] as const;

function parseJsonRecord(text: string | undefined, fallback: Record<string, string>) {
  if (!text?.trim()) return fallback;
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Mapping JSON must be an object, for example {"sku":"SKU"}.');
  return parsed as Record<string, string>;
}

function parseRowsJson(text: string) {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Rows JSON must be a non-empty array of row objects.');
  return parsed as Array<Record<string, unknown>>;
}

function ResultPanel({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>Includes batch status, validation summary, row-level errors and target references when available.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={() => downloadRowErrorReport(value)}>Download row-error report</Button>
      </CardHeader>
      <CardContent><pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{JSON.stringify(value, null, 2)}</pre></CardContent>
    </Card>
  );
}

function downloadRowErrorReport(value: unknown) {
  const batch = (value as { data?: { rows?: Array<{ rowNumber?: number; status?: string; errors?: Array<{ fieldName?: string; code?: string; message?: string }> }> } })?.data;
  const rows = batch?.rows ?? [];
  const csvRows = ['rowNumber,status,field,code,message'];
  for (const row of rows) {
    if (!row.errors?.length) csvRows.push([row.rowNumber ?? '', row.status ?? '', '', '', ''].map(csvEscape).join(','));
    for (const error of row.errors ?? []) csvRows.push([row.rowNumber ?? '', row.status ?? '', error.fieldName ?? '', error.code ?? '', error.message ?? ''].map(csvEscape).join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'nexora-import-row-errors.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function DataImportWizard() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<unknown>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const uploadForm = useForm<UploadImportForm>({
    resolver: zodResolver(UploadImportFormSchema),
    defaultValues: { subjectType: 'EMPLOYEE', fileName: '', fileSizeBytes: 1, mimeType: 'text/csv', checksumSha256: '', documentId: undefined },
    mode: 'onBlur',
  });
  const validateForm = useForm<ValidateImportForm>({
    resolver: zodResolver(ValidateImportFormSchema),
    defaultValues: {
      importBatchId: '',
      mappingJson: '{}',
      rowsJson: '[\n  { "code": "CUST-001", "name": "Example Customer" }\n]',
      duplicatePolicy: 'FAIL',
      validateOnly: true,
    },
    mode: 'onBlur',
  });
  const commitForm = useForm<CommitImportForm>({
    resolver: zodResolver(CommitImportFormSchema),
    defaultValues: { importBatchId: '', approvedByUserId: undefined, mode: 'TRANSACTIONAL_BATCH', commitValidRowsOnly: false },
    mode: 'onBlur',
  });
  const rollbackForm = useForm<RollbackImportForm>({
    resolver: zodResolver(RollbackImportFormSchema),
    defaultValues: { importBatchId: '', reason: '' },
    mode: 'onBlur',
  });

  const templateCards = useMemo(() => importTemplates.map((template) => (
    <Card key={template.subjectType}>
      <CardHeader>
        <CardTitle className="text-sm">{template.label}</CardTitle>
        <CardDescription>Required columns: {template.required}</CardDescription>
      </CardHeader>
    </Card>
  )), []);

  const submitMutation = useMutation({
    mutationFn: async ({ endpoint, payload }: { endpoint: string; payload: Record<string, unknown> }) => {
      const idempotencyKey = createIdempotencyKey('import');
      if (endpoint === '/imports/upload') return uploadImportBatch(payload, idempotencyKey);
      const match = endpoint.match(/^\/imports\/([^/]+)\/(validate|commit|rollback)$/);
      if (!match) throw new Error('Unsupported import command endpoint.');
      const [, importBatchId, command] = match;
      if (command === 'validate') return validateImportBatch(importBatchId, payload, idempotencyKey);
      if (command === 'commit') return commitImportBatch(importBatchId, payload, idempotencyKey);
      return rollbackImportBatch(importBatchId, payload, idempotencyKey);
    },
    onSuccess: async (response) => {
      setRecordError(null);
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: createNexoraQueryKey('imports') });
    },
    onError: (error) => {
      setRecordError(error instanceof Error ? error.message : 'Import command failed.');
    },
  });

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Import Wizard</CardTitle>
          <CardDescription>Baseline onboarding flow for employees, customers, vendors, products, warehouses and opening stock. Validation stores row-level errors, duplicate decisions and rollback-ready audit evidence before any commit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{templateCards}</CardContent>
      </Card>
      {recordError ? <ErrorState title="Import command failed" description={recordError} /> : null}
      <Tabs
        defaultId="upload"
        items={[
          {
            id: 'upload',
            label: 'Upload',
            content: (
              <FormShell form={uploadForm} pending={submitMutation.isPending} submitLabel="Upload import metadata" onSubmit={(values) => submitMutation.mutate({ endpoint: '/imports/upload', payload: values })}>
                <FormSection title="Upload import file" description="The file is represented by validated metadata and checksum. Large objects still go through the controlled document upload design, not a frontend-owned ERP API.">
                  <ResourceFormFields<UploadImportForm> mode="create" fields={[
                    { name: 'subjectType', label: 'Subject type', type: 'select', options: [
                      { label: 'Employees', value: 'EMPLOYEE' }, { label: 'Customers', value: 'CUSTOMER' }, { label: 'Vendors', value: 'VENDOR' }, { label: 'Products', value: 'PRODUCT' }, { label: 'Warehouses', value: 'WAREHOUSE' }, { label: 'Opening stock', value: 'INVENTORY' },
                    ] },
                    { name: 'fileName', label: 'File name', type: 'text' },
                    { name: 'fileSizeBytes', label: 'File size bytes', type: 'number' },
                    { name: 'mimeType', label: 'MIME type', type: 'select', options: [{ label: 'CSV', value: 'text/csv' }, { label: 'Excel XLSX', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }] },
                    { name: 'checksumSha256', label: 'SHA-256 checksum', type: 'text' },
                    { name: 'documentId', label: 'Document id', type: 'text' },
                  ]} />
                </FormSection>
              </FormShell>
            ),
          },
          {
            id: 'validate',
            label: 'Validate',
            content: (
              <FormShell form={validateForm} pending={submitMutation.isPending} submitLabel="Validate import" onSubmit={(values) => {
                const { importBatchId, rowsJson, mappingJson, ...rest } = values;
                try {
                  return submitMutation.mutate({ endpoint: `/imports/${importBatchId}/validate`, payload: { ...rest, rows: parseRowsJson(rowsJson), mapping: parseJsonRecord(mappingJson, {}) } });
                } catch (error) {
                  setRecordError(error instanceof Error ? error.message : 'Invalid JSON payload.');
                }
              }}>
                <FormSection title="Validate rows" description="Paste parsed CSV/XLSX rows as JSON for baseline validation. The backend maps fields, detects duplicates, creates row errors and refuses commit until invalid rows are fixed.">
                  <ResourceFormFields<ValidateImportForm> mode="create" fields={[
                    { name: 'importBatchId', label: 'Import batch id', type: 'text' },
                    { name: 'duplicatePolicy', label: 'Duplicate policy', type: 'select', options: [{ label: 'Fail batch', value: 'FAIL' }, { label: 'Skip duplicates', value: 'SKIP' }, { label: 'Update matches', value: 'UPDATE' }] },
                    { name: 'mappingJson', label: 'Column mapping JSON', type: 'textarea', description: 'Target field to source column map, for example {"sku":"SKU","name":"Product Name"}. Use {} when headers already match.' },
                    { name: 'rowsJson', label: 'Parsed row JSON', type: 'textarea', description: 'Array of row objects from the CSV/XLSX preview.' },
                  ]} />
                </FormSection>
              </FormShell>
            ),
          },
          {
            id: 'commit',
            label: 'Commit',
            content: (
              <FormShell form={commitForm} pending={submitMutation.isPending} submitLabel="Commit import" onSubmit={(values) => {
                const { importBatchId, ...payload } = values;
                return submitMutation.mutate({ endpoint: `/imports/${importBatchId}/commit`, payload });
              }}>
                <FormSection title="Commit valid rows" description="Commit is command-driven, audited and transactional. Created rows remain linked to the source import batch.">
                  <ResourceFormFields<CommitImportForm> mode="create" fields={[
                    { name: 'importBatchId', label: 'Import batch id', type: 'text' },
                    { name: 'approvedByUserId', label: 'Approved by user id', type: 'text' },
                    { name: 'mode', label: 'Commit mode', type: 'select', options: [{ label: 'Transactional batch', value: 'TRANSACTIONAL_BATCH' }, { label: 'Controlled chunk', value: 'CONTROLLED_CHUNK' }] },
                    { name: 'commitValidRowsOnly', label: 'Commit valid rows only', type: 'checkbox' },
                  ]} />
                </FormSection>
              </FormShell>
            ),
          },
          {
            id: 'rollback',
            label: 'Rollback',
            content: (
              <FormShell form={rollbackForm} pending={submitMutation.isPending} submitLabel="Rollback import" onSubmit={(values) => {
                const { importBatchId, ...payload } = values;
                return submitMutation.mutate({ endpoint: `/imports/${importBatchId}/rollback`, payload });
              }}>
                <FormSection title="Rollback import" description="Rollback is audited. Destructive deletes are not allowed unless a module-specific reversal design exists.">
                  <ResourceFormFields<RollbackImportForm> mode="create" fields={[{ name: 'importBatchId', label: 'Import batch id', type: 'text' }, { name: 'reason', label: 'Rollback reason', type: 'textarea' }]} />
                </FormSection>
              </FormShell>
            ),
          },
        ]}
      />
      <ResultPanel title="Latest import command response" value={result} />
    </main>
  );
}
