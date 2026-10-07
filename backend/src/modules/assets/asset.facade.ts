import type { TransactionClient } from '@nexora/database';
import type {
  ApprovalSubjectDecision,
  ApprovalSubjectHandler,
} from '../approvals/index.js';
import { AssetService } from './asset.service.js';

export class AssetFacade implements ApprovalSubjectHandler {
  constructor(private readonly service: AssetService) {}

  assertAsset(organizationId: string, assetId: string) {
    return this.service.assetForFieldService(organizationId, assetId);
  }

  recordFieldServiceCompletion(tx: TransactionClient, input: {
    organizationId:string; assetId:string; workOrderId:string; serviceReportId:string; technicianId:string;
    resolution:string; parts:Array<{productId:string;qty:string;stockTransactionId:string|null}>;
  }) {
    return this.service.recordFieldServiceCompletion(tx,input);
  }

  markUnderMaintenance(tx: TransactionClient, input: {
    organizationId:string; assetId:string; workOrderId:string; scheduleId:string;
  }) {
    return this.service.markUnderMaintenance(tx,input);
  }

  recordMaintenanceCompletion(tx: TransactionClient, input: {
    organizationId:string; assetId:string; maintenanceExecutionId:string; workOrderId:string; result:string; notes:string|null;
    parts:Array<{productId:string;qty:string;stockTransactionId:string|null}>;
  }) {
    return this.service.recordMaintenanceCompletion(tx,input);
  }

  applyApprovalDecision(
    tx: TransactionClient,
    input: ApprovalSubjectDecision,
  ): Promise<void> {
    return this.service.applyApprovalDecision(tx, input);
  }
}
