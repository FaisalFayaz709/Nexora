import { AppError } from '../http/errors.js';

export const PASS_21_UPLOAD_ABUSE_POLICY = 'PASS_21_UPLOAD_ABUSE_POLICY' as const;

export const DEFAULT_ALLOWED_UPLOAD_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.csv', '.xlsx'] as const;

export interface UploadIntentSecurityInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly organizationId: string;
  readonly objectKey: string;
  readonly checksum?: string | null;
}

function lowerFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}

export function assertUploadIntentSecurity(input: UploadIntentSecurityInput, options: {
  readonly maxBytes: number;
  readonly allowedMime?: readonly string[];
  readonly allowedExtensions?: readonly string[];
}): void {
  const allowedMime = options.allowedMime ?? DEFAULT_ALLOWED_UPLOAD_MIME;
  const allowedExtensions = options.allowedExtensions ?? DEFAULT_ALLOWED_UPLOAD_EXTENSIONS;
  if (input.size <= 0 || input.size > options.maxBytes) {
    throw new AppError(413, 'UPLOAD_SIZE_LIMIT_EXCEEDED', 'File upload size is outside the allowed range.');
  }
  if (!allowedMime.includes(input.mimeType)) {
    throw new AppError(415, 'UPLOAD_MIME_NOT_ALLOWED', 'File MIME type is not allowed.');
  }
  const ext = lowerFileExtension(input.fileName);
  if (!allowedExtensions.includes(ext)) {
    throw new AppError(415, 'UPLOAD_EXTENSION_NOT_ALLOWED', 'File extension is not allowed.');
  }
  const tenantPrefix = `organizations/${input.organizationId}/`;
  if (!input.objectKey.startsWith(tenantPrefix) || input.objectKey.includes('..')) {
    throw new AppError(403, 'UPLOAD_OBJECT_KEY_SCOPE_VIOLATION', 'Object key must remain inside the tenant storage prefix.');
  }
}

export function assertCompletedUploadSecurity(input: {
  readonly expectedChecksum?: string | null;
  readonly actualChecksum?: string | null;
  readonly objectExists: boolean;
  readonly privateBucket: boolean;
}): void {
  if (!input.objectExists) throw new AppError(404, 'UPLOAD_OBJECT_MISSING', 'Uploaded object was not found in private storage.');
  if (!input.privateBucket) throw new AppError(500, 'UPLOAD_BUCKET_NOT_PRIVATE', 'Uploads must use private buckets by default.');
  if (input.expectedChecksum && input.actualChecksum && input.expectedChecksum !== input.actualChecksum) {
    throw new AppError(409, 'UPLOAD_CHECKSUM_MISMATCH', 'Uploaded object checksum does not match the expected checksum.');
  }
}
