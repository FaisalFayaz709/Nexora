import type { TransactionClient } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { FieldServiceRepository } from './field-service.repository.js';
import { FieldServiceService } from './field-service.service.js';

export class FieldServiceFacade {
  constructor(
    private readonly service: FieldServiceService,
    private readonly repository = new FieldServiceRepository(),
  ) {}

  async assertWorkOrder(organizationId: string, workOrderId: string) {
    const row = await this.repository.getWorkOrder(organizationId, null, workOrderId);
    if (!row) throw new AppError(404, 'WORK_ORDER_NOT_FOUND', 'Work order not found.');
    return row;
  }

  createMaintenanceWorkOrder(input: {
    organizationId: string;
    branchId: string | null;
    assetId: string;
    projectId: string | null;
    scheduledAt: Date;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actorUserId: string;
    maintenanceScheduleId: string;
    afterCreate: (tx: TransactionClient, workOrder: { id: string; workOrderNo: string }) => Promise<void>;
  }) {
    return this.service.createMaintenanceWorkOrder(input);
  }
}
