import { AppError } from '../../core/http/errors.js';
import { MaintenanceRepository } from './maintenance.repository.js';

export class MaintenanceFacade {
  constructor(private readonly repository = new MaintenanceRepository()) {}

  async assertMaintenanceExecution(organizationId: string, executionId: string) {
    const rows = await this.repository.listSchedules({
      organizationId,
      branchId: null,
      skip: 0,
      take: 1,
    });
    void rows;
    throw new AppError(
      409,
      'MAINTENANCE_FACADE_NOT_YET_CONSUMED',
      'Maintenance facade has no external consumer before later reporting/finance passes.',
    );
  }
}
