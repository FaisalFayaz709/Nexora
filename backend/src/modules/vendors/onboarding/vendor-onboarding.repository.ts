import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class VendorOnboardingRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new VendorOnboardingRepository(db); }

  vendor(organizationId: string, vendorId: string) {
    return this.db.vendor.findFirst({
      where: { id: vendorId, organizationId },
      select: {
        id: true,
        status: true,
        riskRating: true,
        blacklistedAt: true,
      },
    });
  }

  openRequest(organizationId: string, vendorId: string) {
    return this.db.vendorOnboardingRequest.findFirst({
      where: { organizationId, vendorId, status: { in: ['DRAFT', 'SUBMITTED'] } },
      select: { id: true },
    });
  }

  create(data: {
    organizationId: string;
    vendorId: string;
    requestedByUserId: string;
    documentEvidenceJson?: unknown;
    bankEvidenceJson?: unknown;
    categoryIdsJson?: unknown;
  }) {
    return this.db.vendorOnboardingRequest.create({
      data: {
        organizationId: data.organizationId,
        vendorId: data.vendorId,
        requestedByUserId: data.requestedByUserId,
        documentEvidenceJson: (data.documentEvidenceJson ?? []) as never,
        bankEvidenceJson: (data.bankEvidenceJson ?? null) as never,
        categoryIdsJson: (data.categoryIdsJson ?? []) as never,
      },
    });
  }

  async lock(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string; organizationId: string; vendorId: string; approvalRequestId: string | null;
      status: string; requestedByUserId: string; submittedByUserId: string | null;
    }>>`
      SELECT "id","organizationId","vendorId","approvalRequestId","status","requestedByUserId","submittedByUserId"
      FROM "VendorOnboardingRequest"
      WHERE "id" = ${id}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  submit(tx: TransactionClient, id: string, userId: string) {
    return tx.vendorOnboardingRequest.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedByUserId: userId, submittedAt: new Date() },
    });
  }

  approve(tx: TransactionClient, id: string, userId: string, input: {
    documentsVerified: boolean;
    bankVerified: boolean;
    riskScore: number;
    riskRating: string;
    approvedCategoryIds: string[];
    comment?: string | null;
  }) {
    const now = new Date();
    return tx.vendorOnboardingRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByUserId: userId,
        approvedAt: now,
        documentsVerifiedAt: input.documentsVerified ? now : null,
        bankVerifiedAt: input.bankVerified ? now : null,
        riskScore: input.riskScore,
        riskRating: input.riskRating,
        approvedCategoryIdsJson: input.approvedCategoryIds as never,
      },
    });
  }

  blacklist(tx: TransactionClient, id: string, userId: string, input: {
    riskScore: number;
    riskRating: string;
    blacklistReason: string;
  }) {
    return tx.vendorOnboardingRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedByUserId: userId,
        approvedAt: new Date(),
        rejectedAt: new Date(),
        riskScore: input.riskScore,
        riskRating: input.riskRating,
        blacklistReason: input.blacklistReason,
      },
    });
  }

  approveVendor(tx: TransactionClient, vendorId: string, requestId: string, input: {
    riskScore: number;
    riskRating: string;
    documentsVerified: boolean;
    bankVerified: boolean;
    approvedCategoryIds: string[];
  }) {
    const now = new Date();
    return tx.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'APPROVED',
        riskScore: input.riskScore,
        riskRating: input.riskRating,
        documentsVerifiedAt: input.documentsVerified ? now : null,
        bankVerifiedAt: input.bankVerified ? now : null,
        approvedCategoryIdsJson: input.approvedCategoryIds as never,
        blacklistedAt: null,
        blacklistReason: null,
        approvedByOnboardingRequestId: requestId,
      },
    });
  }

  blacklistVendor(tx: TransactionClient, vendorId: string, input: {
    riskScore: number;
    reason: string;
  }) {
    return tx.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'BLACKLISTED',
        riskScore: input.riskScore,
        riskRating: 'BLACKLISTED',
        blacklistedAt: new Date(),
        blacklistReason: input.reason,
      },
    });
  }

  createRiskAssessment(tx: TransactionClient, input: {
    organizationId: string;
    vendorId: string;
    onboardingRequestId: string;
    assessorUserId: string;
    riskScore: number;
    riskRating: string;
    documentsVerified: boolean;
    bankVerified: boolean;
    approvedCategoryIds: string[];
    notes?: string | null;
  }) {
    return tx.vendorRiskAssessment.create({
      data: {
        organizationId: input.organizationId,
        vendorId: input.vendorId,
        onboardingRequestId: input.onboardingRequestId,
        assessorUserId: input.assessorUserId,
        riskScore: input.riskScore,
        riskRating: input.riskRating,
        documentsVerified: input.documentsVerified,
        bankVerified: input.bankVerified,
        approvedCategoryIdsJson: input.approvedCategoryIds as never,
        notes: input.notes ?? null,
      },
    });
  }

  vendorStatus(organizationId: string, vendorId: string) {
    return this.db.vendor.findFirst({
      where: { id: vendorId, organizationId },
      select: {
        status: true,
        riskRating: true,
        riskScore: true,
        blacklistedAt: true,
        blacklistReason: true,
      },
    });
  }
}
