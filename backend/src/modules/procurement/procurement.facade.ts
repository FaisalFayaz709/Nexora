import type { Prisma, TransactionClient } from '@nexora/database';
import type {
  ApprovalSubjectDecision,
  ApprovalSubjectHandler,
} from '../approvals/index.js';
import { ProcurementService, supplierInvoiceSourceFromProcurement } from './procurement.service.js';

export class ProcurementFacade implements ApprovalSubjectHandler {
  constructor(private readonly service: ProcurementService) {}

  createMaterialRequirementForProject(
    tx: TransactionClient,
    input: {
      organizationId: string;
      projectId: string;
      requestedById: string;
      items: Array<{ productId: string; qty: Prisma.Decimal }>;
    },
  ) {
    return this.service.createProjectMaterialRequirement(tx, input);
  }

  projectProcurementReadModel(organizationId: string, projectId: string) {
    return this.service.projectProcurementReadModel(organizationId, projectId);
  }

  supplierInvoiceSource(
    organizationId: string,
    purchaseOrderId: string,
    goodsReceiptId: string,
  ) {
    // Finance needs a stable facade boundary for three-way match context.
    return supplierInvoiceSourceFromProcurement(
      organizationId,
      purchaseOrderId,
      goodsReceiptId,
    );
  }

  applyApprovalDecision(
    tx: TransactionClient,
    input: ApprovalSubjectDecision,
  ): Promise<void> {
    return this.service.applyApprovalDecision(tx, input);
  }
}
