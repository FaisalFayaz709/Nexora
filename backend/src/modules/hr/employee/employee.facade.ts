import { AppError } from '../../../core/http/errors.js';
import { EmployeeRepository } from './employee.repository.js';

export class EmployeeFacade {
  constructor(private readonly repository = new EmployeeRepository()) {}

  async employeeForProject(organizationId: string, employeeId: string) {
    const row = await this.repository.employeeForOrganization(organizationId, employeeId);
    if (!row) {
      throw new AppError(
        400,
        'PROJECT_EMPLOYEE_INVALID',
        'Employee does not belong to the active organization.',
      );
    }
    return row;
  }

  async employeeForUser(organizationId: string, userId: string) {
    const row = await this.repository.findByUser(organizationId, userId);
    if (!row) {
      throw new AppError(409, 'EMPLOYEE_PROFILE_REQUIRED', 'The authenticated user must have an employee profile for this workflow.');
    }
    return row;
  }

  async userIdForEmployee(organizationId: string, employeeId: string): Promise<string> {
    const row = await this.repository.employeeUser(organizationId, employeeId);
    if (!row?.userId) {
      throw new AppError(
        409,
        'APPROVAL_REQUESTER_USER_REQUIRED',
        'Approval workflow requires the subject creator to be linked to an active user.',
      );
    }
    return row.userId;
  }
}
