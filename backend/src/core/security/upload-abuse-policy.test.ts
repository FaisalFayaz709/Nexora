import { describe, expect, it } from 'vitest';
import { assertCompletedUploadSecurity, assertUploadIntentSecurity } from './upload-abuse-policy.js';

describe('PASS 21 upload abuse policy', () => {
  const valid = { fileName: 'invoice.pdf', mimeType: 'application/pdf', size: 1024, organizationId: 'org-1', objectKey: 'organizations/org-1/documents/invoice.pdf' };

  it('accepts private tenant-prefixed upload intents', () => {
    expect(() => assertUploadIntentSecurity(valid, { maxBytes: 10_000_000 })).not.toThrow();
  });

  it('rejects tenant-prefix escape and unexpected file types', () => {
    expect(() => assertUploadIntentSecurity({ ...valid, objectKey: 'organizations/org-2/documents/invoice.pdf' }, { maxBytes: 10_000_000 })).toThrow('UPLOAD_OBJECT_KEY_SCOPE_VIOLATION');
    expect(() => assertUploadIntentSecurity({ ...valid, fileName: 'shell.exe', mimeType: 'application/x-msdownload' }, { maxBytes: 10_000_000 })).toThrow('UPLOAD_MIME_NOT_ALLOWED');
  });

  it('requires completed upload existence, checksum and private bucket evidence', () => {
    expect(() => assertCompletedUploadSecurity({ objectExists: true, privateBucket: true, expectedChecksum: 'a', actualChecksum: 'a' })).not.toThrow();
    expect(() => assertCompletedUploadSecurity({ objectExists: true, privateBucket: true, expectedChecksum: 'a', actualChecksum: 'b' })).toThrow('UPLOAD_CHECKSUM_MISMATCH');
  });
});
