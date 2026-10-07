import type { AppEnv } from '../../config/env.js';

export interface MinioStorageConfig {
  readonly endpoint: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly privateBucket: string;
  readonly publicBucket: string;
  readonly uploadUrlTtlSeconds: number;
  readonly downloadUrlTtlSeconds: number;
  readonly maxUploadBytes: number;
  readonly enforceObjectChecksum: boolean;
}

export interface ParsedMinioEndpoint {
  readonly endPoint: string;
  readonly port: number;
  readonly useSSL: boolean;
}

export function storageConfigFromEnv(env: AppEnv): MinioStorageConfig {
  return {
    endpoint: env.MINIO_ENDPOINT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    privateBucket: env.MINIO_PRIVATE_BUCKET,
    publicBucket: env.MINIO_PUBLIC_BUCKET,
    uploadUrlTtlSeconds: env.MINIO_UPLOAD_URL_TTL_SECONDS,
    downloadUrlTtlSeconds: env.MINIO_DOWNLOAD_URL_TTL_SECONDS,
    maxUploadBytes: env.DOCUMENT_MAX_UPLOAD_BYTES,
    enforceObjectChecksum: env.DOCUMENT_ENFORCE_OBJECT_CHECKSUM,
  };
}

export function parseMinioEndpoint(endpoint: string): ParsedMinioEndpoint {
  const parsed = new URL(endpoint);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('MINIO_ENDPOINT must use http or https.');
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('MINIO_ENDPOINT must be an origin URL without path, query or hash.');
  }
  const useSSL = parsed.protocol === 'https:';
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : useSSL ? 443 : 80;
  return { endPoint: parsed.hostname, port, useSSL };
}
