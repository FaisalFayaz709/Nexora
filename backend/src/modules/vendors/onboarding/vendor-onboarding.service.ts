import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import { VendorOnboardingRepository } from './vendor-onboarding.repository.js';

export class VendorOnboardingService {
  constructor(private readonly repository = new VendorOnboardingRepository(), private readonly auditWriter = new AuditWriter()) {}

  async create(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: {
    vendorId: string;
    documentEvidence?: unknown[];
    bankEvidence?: unknown;
    categoryIds?: string[];
  }) {
    const vendor = await this.repository.vendor(tenant.organizationId, input.vendorId);
    if (!vendor) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
    if (vendor.status === 'APPROVED') throw new AppError(409, 'VENDOR_ALREADY_APPROVED', 'Vendor is already approved.');
    if (vendor.status === 'BLACKLISTED' || vendor.blacklistedAt) throw new AppError(409, 'VENDOR_BLACKLISTED', 'Blacklisted vendor cannot be onboarded.');
    if (await this.repository.openRequest(tenant.organizationId, input.vendorId)) throw new AppError(409, 'VENDOR_ONBOARDING_ALREADY_OPEN', 'An open onboarding request already exists for this vendor.');
    return withTransaction(async (tx) => {
      const row = await this.repository.withDb(tx).create({
        organizationId: tenant.organizationId,
        vendorId: input.vendorId,
        requestedByUserId: actor.userId,
        documentEvidenceJson: input.documentEvidence ?? [],
        bankEvidenceJson: input.bankEvidence ?? null,
        categoryIdsJson: input.categoryIds ?? [],
      });
      await this.auditWriter.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'VENDOR_ONBOARDING_CREATED', subjectType: 'VendorOnboardingRequest', subjectId: row.id, afterJson: { vendorId: input.vendorId, status: row.status, documentEvidenceCount: input.documentEvidence?.length ?? 0, categoryIds: input.categoryIds ?? [] }, ip: actor.ip });
      return this.dto(row);
    });
  }

  async submit(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string) {
    return withTransaction(async (tx) => {
      const row = await this.repository.lock(tx, tenant.organizationId, id);
      if (!row) throw new AppError(404, 'VENDOR_ONBOARDING_NOT_FOUND', 'Vendor onboarding request not found.');
      if (row.status !== 'DRAFT') throw new AppError(409, 'VENDOR_ONBOARDING_INVALID_STATE', 'Only DRAFT requests can be submitted.');
      const vendor = await this.repository.vendor(tenant.organizationId, row.vendorId);
      if (!vendor) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.');
      if (vendor.status === 'BLACKLISTED' || vendor.blacklistedAt) throw new AppError(409, 'VENDOR_BLACKLISTED', 'Blacklisted vendor cannot be submitted for onboarding.');
      const updated = await this.repository.submit(tx, id, actor.userId);
      await this.auditWriter.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'VENDOR_ONBOARDING_SUBMITTED', subjectType: 'VendorOnboardingRequest', subjectId: id, beforeJson: { status: row.status }, afterJson: { status: updated.status }, ip: actor.ip });
      return this.dto(updated);
    });
  }

  async approve(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: {
    decision: 'APPROVE' | 'BLACKLIST';
    comment?: string | null;
    documentsVerified: boolean;
    bankVerified: boolean;
    riskScore: number;
    riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLACKLISTED';
    approvedCategoryIds: string[];
    blacklistReason?: string | null;
  }) {
    return withTransaction(async (tx) => {
      const row = await this.repository.lock(tx, tenant.organizationId, id);
      if (!row) throw new AppError(404, 'VENDOR_ONBOARDING_NOT_FOUND', 'Vendor onboarding request not found.');
      if (row.status !== 'SUBMITTED') throw new AppError(409, 'VENDOR_ONBOARDING_INVALID_STATE', 'Only SUBMITTED requests can be approved or blacklisted.');
      if (row.requestedByUserId === actor.userId || row.submittedByUserId === actor.userId) {
        throw new AppError(403, 'VENDOR_ONBOARDING_MAKER_CHECKER_REQUIRED', 'Requester/submitter cannot approve the same vendor onboarding request.');
      }

      await this.repository.createRiskAssessment(tx, {
        organizationId: tenant.organizationId,
        vendorId: row.vendorId,
        onboardingRequestId: id,
        assessorUserId: actor.userId,
        riskScore: input.riskScore,
        riskRating: input.riskRating,
        documentsVerified: input.documentsVerified,
        bankVerified: input.bankVerified,
        approvedCategoryIds: input.approvedCategoryIds,
        notes: input.comment ?? null,
      });

      if (input.decision === 'BLACKLIST') {
        const updated = await this.repository.blacklist(tx, id, actor.userId, {
          riskScore: input.riskScore,
          riskRating: 'BLACKLISTED',
          blacklistReason: input.blacklistReason!,
        });
        await this.repository.blacklistVendor(tx, row.vendorId, {
          riskScore: input.riskScore,
          reason: input.blacklistReason!,
        });
        await this.auditWriter.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'VENDOR_BLACKLISTED', subjectType: 'VendorOnboardingRequest', subjectId: id, beforeJson: { status: row.status }, afterJson: { status: updated.status, vendorStatus: 'BLACKLISTED', riskScore: input.riskScore, blacklistReason: input.blacklistReason }, ip: actor.ip });
        return this.dto(updated);
      }

      if (!input.documentsVerified || !input.bankVerified) {
        throw new AppError(400, 'VENDOR_VERIFICATION_REQUIRED', 'Vendor documents and bank details must be verified before approval.');
      }
      if (input.riskRating === 'HIGH' || input.riskRating === 'BLACKLISTED') {
        throw new AppError(409, 'VENDOR_RISK_BLOCKED', 'High-risk or blacklisted vendor cannot be approved.');
      }

      const updated = await this.repository.approve(tx, id, actor.userId, input);
      await this.repository.approveVendor(tx, row.vendorId, id, input);
      await this.auditWriter.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'VENDOR_ONBOARDING_APPROVED', subjectType: 'VendorOnboardingRequest', subjectId: id, beforeJson: { status: row.status }, afterJson: { status: updated.status, vendorStatus: 'APPROVED', riskScore: input.riskScore, riskRating: input.riskRating, bankVerified: input.bankVerified, documentsVerified: input.documentsVerified, approvedCategoryIds: input.approvedCategoryIds, comment: input.comment ?? null }, ip: actor.ip });
      return this.dto(updated);
    });
  }

  private dto(row: { id: string; vendorId: string; status: string; approvalRequestId: string | null; riskScore?: number | null; riskRating?: string | null }) {
    return { id: row.id, vendorId: row.vendorId, status: row.status, approvalRequestId: row.approvalRequestId, riskScore: row.riskScore ?? null, riskRating: row.riskRating ?? null };
  }
}
