import { describe, expect, it } from 'vitest';
import { CommitImportSchema, ImportRawRowSchema, ImportUploadSchema, RollbackImportSchema, ValidateImportSchema } from '@nexora/shared';

describe('Data import contracts', () => {
  it('validates CSV upload metadata', () => {
    const value = ImportUploadSchema.parse({ subjectType: 'PRODUCT', fileName: 'products.csv', fileSizeBytes: 100, mimeType: 'text/csv', checksumSha256: 'a'.repeat(64) });
    expect(value.subjectType).toBe('PRODUCT');
  });

  it('validates opening-stock subject metadata', () => {
    const value = ImportUploadSchema.parse({ subjectType: 'INVENTORY', fileName: 'opening-stock.xlsx', fileSizeBytes: 100, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', checksumSha256: 'b'.repeat(64) });
    expect(value.subjectType).toBe('INVENTORY');
  });

  it('validates mapping, duplicate policy and preview rows', () => {
    const value = ValidateImportSchema.parse({
      mapping: { sku: 'SKU', name: 'Product Name' },
      duplicatePolicy: 'UPDATE',
      rows: [{ SKU: 'CAM-001', 'Product Name': 'IP Camera' }],
    });
    expect(value.duplicatePolicy).toBe('UPDATE');
    expect(value.rows?.[0]?.SKU).toBe('CAM-001');
  });

  it('allows primitive CSV/XLSX cell values only', () => {
    expect(ImportRawRowSchema.parse({ code: 'CUST-001', active: true, limit: 5000, notes: null }).code).toBe('CUST-001');
  });

  it('defaults commit mode and valid-row policy', () => {
    const value = CommitImportSchema.parse({});
    expect(value.mode).toBe('TRANSACTIONAL_BATCH');
    expect(value.commitValidRowsOnly).toBe(false);
  });

  it('requires rollback reason', () => {
    expect(() => RollbackImportSchema.parse({ reason: 'no' })).toThrow();
  });
});
