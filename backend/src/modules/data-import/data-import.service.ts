import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { DataImportRepository } from './data-import.repository.js';

type ImportRowErrorDraft = { fieldName?: string | null; code: string; message: string; severity?: string };
type ImportValidationRow = {
  rawJson: Record<string, unknown>;
  normalizedJson: Record<string, unknown> | null;
  status: string;
  errors: ImportRowErrorDraft[];
};

type ImportSubjectDefinition = {
  required: string[];
  duplicateKey: string[];
  optional?: string[];
};

const IMPORT_SUBJECTS: Record<string, ImportSubjectDefinition> = {
  EMPLOYEE: { required: ['employeeNo', 'name', 'branchId', 'departmentId'], duplicateKey: ['employeeNo'], optional: ['userId', 'managerId', 'jobTitle', 'joiningDate', 'employmentType', 'status'] },
  CUSTOMER: { required: ['code', 'name'], duplicateKey: ['code'], optional: ['taxNo', 'creditLimit', 'status'] },
  CUSTOMER_SITE: { required: ['customerId', 'code', 'name'], duplicateKey: ['code'], optional: ['addressId'] },
  VENDOR: { required: ['code', 'name'], duplicateKey: ['code'], optional: ['taxNo', 'paymentTerms', 'status'] },
  PRODUCT_CATEGORY: { required: ['name'], duplicateKey: ['name'], optional: ['parentId'] },
  UNIT_OF_MEASURE: { required: ['code', 'name'], duplicateKey: ['code'], optional: ['precision'] },
  PRODUCT: { required: ['sku', 'name', 'categoryId', 'unitId', 'trackingType'], duplicateKey: ['sku'], optional: ['brand', 'model', 'barcode', 'standardCost', 'salesPrice', 'minStock', 'maxStock'] },
  WAREHOUSE: { required: ['branchId', 'code', 'name'], duplicateKey: ['code'], optional: ['status'] },
  INVENTORY: { required: ['warehouseId', 'productId', 'onHand'], duplicateKey: ['warehouseId', 'locationId', 'productId'], optional: ['locationId', 'reserved'] },
};

function asRows(input: any, fileName: string): Record<string, unknown>[] {
  if (Array.isArray(input.rows) && input.rows.length > 0) return input.rows;
  return [{ __sourceFileName: fileName, __validationError: 'No parsed rows supplied to validation request.' }];
}

function normalizeRow(raw: Record<string, unknown>, mapping: Record<string, string>) {
  const normalized: Record<string, unknown> = {};
  if (Object.keys(mapping).length === 0) {
    for (const [key, value] of Object.entries(raw)) normalized[key] = value;
    return normalized;
  }
  for (const [targetField, sourceColumn] of Object.entries(mapping)) normalized[targetField] = raw[sourceColumn];
  return normalized;
}

function isBlank(value: unknown) {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function statusForDuplicate(policy: string, duplicate: unknown) {
  if (!duplicate) return 'VALID';
  if (policy === 'SKIP') return 'SKIPPED';
  if (policy === 'UPDATE') return 'VALID';
  return 'INVALID';
}

export class DataImportService {
  constructor(
    private readonly access: PlatformAccessFacade,
    private readonly repository = new DataImportRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(org: string) {
    await this.access.assertModuleEnabled(org, 'imports');
  }

  async upload(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const batch = await this.repository.withDb(tx).createBatch(tx, {
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
        subjectType: input.subjectType,
        status: 'UPLOADED',
        fileName: input.fileName,
        fileSizeBytes: BigInt(input.fileSizeBytes),
        mimeType: input.mimeType,
        checksumSha256: input.checksumSha256,
        documentId: input.documentId ?? null,
        createdById: actor.userId,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'IMPORT_BATCH_UPLOADED', subjectType: 'ImportBatch', subjectId: batch.id, afterJson: { subjectType: input.subjectType, fileName: input.fileName, checksumSha256: input.checksumSha256 }, ip: actor.ip });
      return batch;
    });
  }

  async validate(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const batch = await this.repository.lockBatch(tx, tenant.organizationId, id);
      if (!batch) throw new AppError(404, 'IMPORT_BATCH_NOT_FOUND', 'Import batch not found.');
      if (batch.status !== 'UPLOADED' && batch.status !== 'FAILED') throw new AppError(409, 'IMPORT_BATCH_NOT_VALIDATABLE', 'Only uploaded/failed batches can be validated.');

      const subject = IMPORT_SUBJECTS[batch.subjectType];
      if (!subject) throw new AppError(400, 'IMPORT_SUBJECT_UNSUPPORTED', `Import subject ${batch.subjectType} is not supported by the baseline wizard.`);

      const rows = asRows(input, batch.fileName);
      const validationRows: ImportValidationRow[] = [];
      for (const raw of rows) {
        const normalized = normalizeRow(raw, input.mapping ?? {});
        const errors: ImportRowErrorDraft[] = [];
        if (raw.__validationError) errors.push({ code: 'IMPORT_ROWS_MISSING', message: String(raw.__validationError), severity: 'ERROR' });
        for (const field of subject.required) {
          if (isBlank(normalized[field])) errors.push({ fieldName: field, code: 'REQUIRED_FIELD_MISSING', message: `${field} is required for ${batch.subjectType} imports.`, severity: 'ERROR' });
        }
        const duplicate = errors.length ? null : await this.repository.findDuplicate(tx, tenant.organizationId, batch.subjectType, normalized);
        if (duplicate && input.duplicatePolicy === 'FAIL') {
          errors.push({ fieldName: subject.duplicateKey.join(','), code: 'DUPLICATE_RECORD', message: `Duplicate ${batch.subjectType} exists for ${subject.duplicateKey.join(' + ')}.`, severity: 'ERROR' });
        }
        const status = errors.length ? 'INVALID' : statusForDuplicate(input.duplicatePolicy, duplicate);
        validationRows.push({
          rawJson: raw,
          normalizedJson: { ...normalized, __importAction: duplicate && input.duplicatePolicy === 'UPDATE' ? 'UPDATE' : duplicate && input.duplicatePolicy === 'SKIP' ? 'SKIP' : 'CREATE' },
          status,
          errors,
        });
      }

      await this.repository.replaceValidationRows(tx, tenant.organizationId, id, validationRows);
      const summary = {
        totalRows: validationRows.length,
        validRows: validationRows.filter((row) => row.status === 'VALID').length,
        skippedRows: validationRows.filter((row) => row.status === 'SKIPPED').length,
        errorRows: validationRows.filter((row) => row.status === 'INVALID').length,
        duplicatePolicy: input.duplicatePolicy,
        requiredFields: subject.required,
        duplicateKey: subject.duplicateKey,
      };
      const updated = await this.repository.updateBatch(tx, id, {
        status: summary.errorRows > 0 ? 'FAILED' : 'VALIDATED',
        mappingJson: (input.mapping ?? {}) as never,
        duplicatePolicy: input.duplicatePolicy,
        validationSummaryJson: summary as never,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'IMPORT_BATCH_VALIDATED', subjectType: 'ImportBatch', subjectId: id, afterJson: summary, ip: actor.ip });
      return this.repository.withDb(tx).getBatch(tenant.organizationId, updated.id);
    });
  }

  async commit(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const batch = await this.repository.lockBatch(tx, tenant.organizationId, id);
      if (!batch) throw new AppError(404, 'IMPORT_BATCH_NOT_FOUND', 'Import batch not found.');
      if (batch.status !== 'VALIDATED') throw new AppError(409, 'IMPORT_BATCH_NOT_COMMITTABLE', 'Only fully validated batches can be committed. Re-run validation after fixing failed rows.');
      const rows = await this.repository.getBatchRows(tx, tenant.organizationId, id);
      const invalidRows = rows.filter((row) => row.status === 'INVALID');
      if (invalidRows.length > 0 && !input.commitValidRowsOnly) throw new AppError(409, 'IMPORT_BATCH_HAS_INVALID_ROWS', 'Import batch has invalid rows. Fix them or explicitly commit valid rows only.');

      let committedRows = 0;
      let skippedRows = 0;
      for (const row of rows) {
        if (row.status === 'SKIPPED') {
          skippedRows += 1;
          continue;
        }
        if (row.status !== 'VALID') continue;
        const normalized = (row.normalizedJson ?? {}) as Record<string, unknown>;
        const target = await this.repository.commitTarget(tx, tenant.organizationId, tenant.branchId, id, batch.subjectType, normalized, batch.duplicatePolicy);
        if (!target) {
          await this.repository.markRowSkipped(tx, row.id);
          skippedRows += 1;
          continue;
        }
        await this.repository.markRowCommitted(tx, row.id, target);
        committedRows += 1;
      }
      const summary = { mode: input.mode, subjectType: batch.subjectType, committedRows, skippedRows };
      await this.repository.updateBatch(tx, id, { status: 'COMMITTED', committedAt: new Date(), committedById: input.approvedByUserId ?? actor.userId, validationSummaryJson: { ...(batch.validationSummaryJson ?? {}), ...summary } as never });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'IMPORT_BATCH_COMMITTED', subjectType: 'ImportBatch', subjectId: id, afterJson: summary, ip: actor.ip });
      await this.events.append(tx, { organizationId: tenant.organizationId, type: 'import.batch.committed', aggregateType: 'ImportBatch', aggregateId: id, payload: summary });
      return this.repository.withDb(tx).getBatch(tenant.organizationId, id);
    });
  }

  async rollback(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const batch = await this.repository.lockBatch(tx, tenant.organizationId, id);
      if (!batch) throw new AppError(404, 'IMPORT_BATCH_NOT_FOUND', 'Import batch not found.');
      if (batch.status !== 'COMMITTED') throw new AppError(409, 'IMPORT_BATCH_NOT_ROLLBACKABLE', 'Only committed batches can be rolled back by policy.');
      await this.repository.updateRows(tx, id, 'ROLLED_BACK');
      const updated = await this.repository.updateBatch(tx, id, { status: 'ROLLED_BACK', rolledBackAt: new Date(), rollbackReason: input.reason });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'IMPORT_BATCH_ROLLED_BACK', subjectType: 'ImportBatch', subjectId: id, afterJson: { reason: input.reason, rollbackPolicy: 'logical-marker-only; destructive deletes are forbidden without module-specific reversal design' }, ip: actor.ip });
      await this.events.append(tx, { organizationId: tenant.organizationId, type: 'import.batch.rolled_back', aggregateType: 'ImportBatch', aggregateId: id, payload: { reason: input.reason } });
      return this.repository.withDb(tx).getBatch(tenant.organizationId, updated.id);
    });
  }
}
