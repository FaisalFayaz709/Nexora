import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import { StorageService } from '../../core/storage/storage-service.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { DocumentRepository } from './document.repository.js';
import { assertDocumentRetentionAllowsDelete, assertDocumentUploadIntentTrace, assertDocumentVersionObjectKey, assertTenantScopedDocumentLink, nextDocumentVersionNo } from '../documents-notifications/index.js';

function page(q: any) {
  const p = q.page ?? 1;
  const pageSize = Math.min(q.pageSize ?? 25, 100);
  return { page: p, pageSize, skip: (p - 1) * pageSize, take: pageSize };
}

export class DocumentService {
  constructor(
    private readonly access: PlatformAccessFacade,
    private readonly repository = new DocumentRepository(),
    private readonly storage = new StorageService(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(org: string) {
    await this.access.assertModuleEnabled(org, 'documents');
  }

  async list(t: TenantRequestContext, q: any) {
    await this.enabled(t.organizationId);
    const p = page(q);
    const r = await this.repository.list(t.organizationId, q, p.skip, p.take);
    return { ...r, page: p.page, pageSize: p.pageSize };
  }

  async get(t: TenantRequestContext, actor: any, id: string) {
    await this.enabled(t.organizationId);
    const row = await this.repository.get(t.organizationId, id);
    if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    await this.repository.access({
      organizationId: t.organizationId,
      documentId: id,
      actorUserId: actor.userId,
      action: 'VIEW',
      ip: actor.ip,
    });
    return row;
  }

  async uploadIntent(t: TenantRequestContext, actor: any, input: any) {
    await this.enabled(t.organizationId);
    const intent = await this.storage.uploadIntent({
      organizationId: t.organizationId,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category,
    });
    assertDocumentUploadIntentTrace({
      organizationId: t.organizationId,
      actorUserId: actor.userId,
      objectKey: intent.objectKey,
      bucketName: intent.bucketName,
      privateBucket: this.storage.privateBucketName(),
      expiresInSeconds: intent.expiresInSeconds,
    });
    await withTransaction(async (tx) => {
      await this.audit.append(tx, {
        organizationId: t.organizationId,
        actorUserId: actor.userId,
        action: 'DOCUMENT_UPLOAD_INTENT_CREATED',
        subjectType: 'DocumentUploadIntent',
        subjectId: actor.userId,
        afterJson: {
          subjectType: input.subjectType,
          subjectId: input.subjectId ?? null,
          category: input.category,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          objectKey: intent.objectKey,
          expiresInSeconds: intent.expiresInSeconds,
        },
        ip: actor.ip,
      });
    });
    return intent;
  }

  async completeUpload(t: TenantRequestContext, actor: any, input: any) {
    await this.enabled(t.organizationId);
    const verified = await this.storage.verifyCompletedUpload({
      organizationId: t.organizationId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      objectKey: input.objectKey,
    });
    assertDocumentVersionObjectKey({ latestVersionNo: 0, newChecksumSha256: verified.checksumSha256, objectKey: verified.objectKey, tenantOrganizationId: t.organizationId });
    if (input.subjectId) {
      assertTenantScopedDocumentLink({
        documentOrganizationId: t.organizationId,
        tenantOrganizationId: t.organizationId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        category: input.category,
        actorUserId: actor.userId,
      });
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const doc = await repo.createDocument({
        organizationId: t.organizationId,
        subjectType: input.subjectType,
        subjectId: input.subjectId ?? null,
        title: input.title,
        category: input.category,
        status: 'ACTIVE',
        createdById: actor.userId,
      });
      const version = await repo.addVersion({
        organizationId: t.organizationId,
        documentId: doc.id,
        versionNo: 1,
        bucketName: verified.bucketName,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: verified.sizeBytes,
        checksumSha256: verified.checksumSha256,
        objectKey: verified.objectKey,
        uploadedById: actor.userId,
      });
      const updated = await repo.setCurrentVersion(t.organizationId, doc.id, version.id);
      if (!updated) throw new AppError(409, 'DOCUMENT_CURRENT_VERSION_UPDATE_FAILED', 'Document current version could not be updated inside tenant scope.');
      if (input.subjectId) {
        await repo.createLink({
          organizationId: t.organizationId,
          documentId: doc.id,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          category: input.category,
          linkedById: actor.userId,
        });
      }
      await this.events.append(tx, {
        organizationId: t.organizationId,
        type: 'document.upload.completed',
        aggregateType: 'Document',
        aggregateId: doc.id,
        payload: { subjectType: input.subjectType, subjectId: input.subjectId ?? null, category: input.category, versionId: version.id },
      });
      await this.audit.append(tx, {
        organizationId: t.organizationId,
        actorUserId: actor.userId,
        action: 'DOCUMENT_COMPLETED_UPLOAD',
        subjectType: 'Document',
        subjectId: doc.id,
        afterJson: { documentId: doc.id, versionId: version.id, objectKey: verified.objectKey },
        ip: actor.ip,
      });
      return updated;
    });
  }

  async create(t: TenantRequestContext, actor: any, input: any) {
    return this.completeUpload(t, actor, input);
  }

  async delete(t: TenantRequestContext, actor: any, id: string) {
    const before = await this.get(t, actor, id);
    return withTransaction(async (tx) => {
      assertDocumentRetentionAllowsDelete({ retentionUntil: before.retentionUntil, now: new Date() });
      const row = await this.repository.withDb(tx).softDelete(t.organizationId, id);
      if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found for tenant-scoped deletion.');
      await this.audit.append(tx, {
        organizationId: t.organizationId,
        actorUserId: actor.userId,
        action: 'DOCUMENT_DELETED',
        subjectType: 'Document',
        subjectId: id,
        beforeJson: before,
        afterJson: row,
        ip: actor.ip,
      });
      return row;
    });
  }

  async downloadUrl(t: TenantRequestContext, actor: any, id: string) {
    const version = await this.repository.latestVersion(t.organizationId, id);
    if (!version) throw new AppError(404, 'DOCUMENT_VERSION_NOT_FOUND', 'Document version not found.');
    await this.repository.access({
      organizationId: t.organizationId,
      documentId: id,
      actorUserId: actor.userId,
      action: 'DOWNLOAD_URL',
      ip: actor.ip,
    });
    return this.storage.downloadUrl({
      organizationId: t.organizationId,
      bucketName: version.bucketName,
      objectKey: version.objectKey,
    });
  }

  async addVersion(t: TenantRequestContext, actor: any, id: string, input: any) {
    await this.get(t, actor, id);
    const verified = await this.storage.verifyCompletedUpload({
      organizationId: t.organizationId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      objectKey: input.objectKey,
    });
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const latest = await repo.latestVersion(t.organizationId, id);
      assertDocumentVersionObjectKey({ latestVersionNo: latest?.versionNo ?? 0, newChecksumSha256: verified.checksumSha256, objectKey: verified.objectKey, tenantOrganizationId: t.organizationId });
      const versionNo = nextDocumentVersionNo(latest?.versionNo ?? 0);
      const version = await repo.addVersion({
        organizationId: t.organizationId,
        documentId: id,
        versionNo,
        bucketName: verified.bucketName,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: verified.sizeBytes,
        checksumSha256: verified.checksumSha256,
        objectKey: verified.objectKey,
        uploadedById: actor.userId,
      });
      const updated = await repo.setCurrentVersion(t.organizationId, id, version.id);
      if (!updated) throw new AppError(409, 'DOCUMENT_CURRENT_VERSION_UPDATE_FAILED', 'Document current version could not be updated inside tenant scope.');
      await this.events.append(tx, {
        organizationId: t.organizationId,
        type: 'document.version.added',
        aggregateType: 'Document',
        aggregateId: id,
        payload: { versionId: version.id, versionNo, objectKey: verified.objectKey },
      });
      await this.audit.append(tx, {
        organizationId: t.organizationId,
        actorUserId: actor.userId,
        action: 'DOCUMENT_VERSION_ADDED',
        subjectType: 'Document',
        subjectId: id,
        afterJson: { versionId: version.id, versionNo, objectKey: verified.objectKey },
        ip: actor.ip,
      });
      return version;
    });
  }
}
