import { randomUUID, createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import * as Minio from 'minio';
import { readEnv } from '../../config/env.js';
import { AppError } from '../http/errors.js';
import { parseMinioEndpoint, storageConfigFromEnv, type MinioStorageConfig } from './storage-config.js';

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.dll',
  '.js',
  '.mjs',
  '.cjs',
  '.ps1',
  '.sh',
  '.php',
  '.py',
  '.jar',
  '.war',
]);

const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
]);

const ALLOWED_MIME_PREFIXES = ['image/'];

export interface UploadIntentInput {
  readonly organizationId: string;
  readonly subjectType: string;
  readonly subjectId?: string | null;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly category: string;
}

export interface UploadIntentResult {
  readonly bucketName: string;
  readonly objectKey: string;
  readonly uploadUrl: string;
  readonly expiresInSeconds: number;
  readonly requiredHeaders: Record<string, string>;
}

export interface CompletedUploadInput {
  readonly organizationId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly objectKey: string;
}

export interface VerifiedObjectResult {
  readonly bucketName: string;
  readonly objectKey: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface DownloadUrlInput {
  readonly organizationId: string;
  readonly bucketName?: string | null;
  readonly objectKey: string;
}

export class StorageService {
  private readonly client: Minio.Client;
  private ensureReady: Promise<void> | null = null;

  constructor(private readonly config: MinioStorageConfig = storageConfigFromEnv(readEnv())) {
    const endpoint = parseMinioEndpoint(config.endpoint);
    this.client = new Minio.Client({
      endPoint: endpoint.endPoint,
      port: endpoint.port,
      useSSL: endpoint.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  privateBucketName(): string {
    return this.config.privateBucket;
  }

  publicBucketName(): string {
    return this.config.publicBucket;
  }

  async uploadIntent(input: UploadIntentInput): Promise<UploadIntentResult> {
    this.validateUploadInput(input.fileName, input.mimeType, input.sizeBytes);
    await this.ensureBuckets();

    const objectKey = this.buildPrivateObjectKey(input);
    const uploadUrl = await this.client.presignedPutObject(
      this.config.privateBucket,
      objectKey,
      this.config.uploadUrlTtlSeconds,
    );

    return {
      bucketName: this.config.privateBucket,
      objectKey,
      uploadUrl,
      expiresInSeconds: this.config.uploadUrlTtlSeconds,
      requiredHeaders: {
        'content-type': input.mimeType,
        'x-amz-meta-nexora-organization-id': input.organizationId,
      },
    };
  }

  async verifyCompletedUpload(input: CompletedUploadInput): Promise<VerifiedObjectResult> {
    this.validateUploadInput(input.fileName, input.mimeType, input.sizeBytes);
    this.assertTenantObjectKey(input.organizationId, input.objectKey);
    await this.ensureBuckets();

    const stat = await this.client.statObject(this.config.privateBucket, input.objectKey).catch((error: unknown) => {
      throw new AppError(400, 'DOCUMENT_OBJECT_NOT_FOUND', 'Uploaded object was not found in private MinIO storage.', {
        objectKey: input.objectKey,
        storageError: error instanceof Error ? error.message : 'unknown',
      });
    });

    if (Number(stat.size) !== input.sizeBytes) {
      throw new AppError(400, 'DOCUMENT_OBJECT_SIZE_MISMATCH', 'Uploaded object size does not match the completed-upload request.', {
        expectedSizeBytes: input.sizeBytes,
        actualSizeBytes: Number(stat.size),
      });
    }

    if (this.config.enforceObjectChecksum) {
      const actualChecksum = await this.sha256Object(this.config.privateBucket, input.objectKey);
      if (actualChecksum.toLowerCase() !== input.checksumSha256.toLowerCase()) {
        throw new AppError(400, 'DOCUMENT_OBJECT_CHECKSUM_MISMATCH', 'Uploaded object checksum does not match the completed-upload request.');
      }
    }

    return {
      bucketName: this.config.privateBucket,
      objectKey: input.objectKey,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256.toLowerCase(),
    };
  }

  async downloadUrl(input: DownloadUrlInput) {
    const bucketName = input.bucketName || this.config.privateBucket;
    if (bucketName !== this.config.privateBucket && bucketName !== this.config.publicBucket) {
      throw new AppError(403, 'DOCUMENT_BUCKET_FORBIDDEN', 'Requested document bucket is not configured for this application.');
    }
    this.assertTenantObjectKey(input.organizationId, input.objectKey);
    await this.ensureBuckets();

    const downloadUrl = await this.client.presignedGetObject(
      bucketName,
      input.objectKey,
      this.config.downloadUrlTtlSeconds,
    );

    return { downloadUrl, expiresInSeconds: this.config.downloadUrlTtlSeconds };
  }

  private async ensureBuckets(): Promise<void> {
    if (!this.ensureReady) {
      this.ensureReady = Promise.all([
        this.ensureBucket(this.config.privateBucket),
        this.ensureBucket(this.config.publicBucket),
      ]).then(() => undefined);
    }
    return this.ensureReady;
  }

  private async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) await this.client.makeBucket(bucketName);
  }

  private async sha256Object(bucketName: string, objectKey: string): Promise<string> {
    const stream = (await this.client.getObject(bucketName, objectKey)) as Readable;
    const hash = createHash('sha256');
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

  private buildPrivateObjectKey(input: UploadIntentInput): string {
    const safeSubject = sanitizePathSegment(input.subjectType);
    const safeCategory = sanitizePathSegment(input.category);
    const safeName = sanitizeFileName(input.fileName);
    const subjectId = input.subjectId ? sanitizePathSegment(input.subjectId) : 'unlinked';
    const date = new Date();
    const yyyy = date.getUTCFullYear().toString();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `organizations/${input.organizationId}/documents/${safeSubject}/${subjectId}/${safeCategory}/${yyyy}/${mm}/${randomUUID()}-${safeName}`;
  }

  private assertTenantObjectKey(organizationId: string, objectKey: string): void {
    const requiredPrefix = `organizations/${organizationId}/documents/`;
    if (!objectKey.startsWith(requiredPrefix)) {
      throw new AppError(403, 'DOCUMENT_OBJECT_TENANT_MISMATCH', 'Document object key is outside the authenticated tenant storage prefix.');
    }
    if (objectKey.includes('..') || objectKey.startsWith('/') || objectKey.includes('//')) {
      throw new AppError(400, 'DOCUMENT_OBJECT_KEY_INVALID', 'Document object key is invalid.');
    }
  }

  private validateUploadInput(fileName: string, mimeType: string, sizeBytes: number): void {
    if (sizeBytes <= 0 || sizeBytes > this.config.maxUploadBytes) {
      throw new AppError(400, 'DOCUMENT_TOO_LARGE', 'Document exceeds the configured upload limit.', {
        maxUploadBytes: this.config.maxUploadBytes,
      });
    }
    const lowerName = fileName.toLowerCase();
    for (const extension of BLOCKED_EXTENSIONS) {
      if (lowerName.endsWith(extension)) {
        throw new AppError(400, 'DOCUMENT_FILE_TYPE_BLOCKED', 'This file type is not allowed for document upload.');
      }
    }
    const normalizedMime = mimeType.toLowerCase();
    const allowed = ALLOWED_MIME_EXACT.has(normalizedMime) || ALLOWED_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix));
    if (!allowed) {
      throw new AppError(400, 'DOCUMENT_MIME_TYPE_BLOCKED', 'This MIME type is not allowed for document upload.');
    }
  }
}

function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._=-]/g, '_').slice(0, 120) || 'unknown';
}

function sanitizeFileName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, '_').slice(0, 180) || 'document.bin';
}
