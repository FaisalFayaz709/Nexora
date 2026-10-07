import type { FastifyPluginAsync } from 'fastify';
import type { ApprovalFacade } from '../approvals/index.js';
import type { FinanceFacade } from '../finance/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { OrganizationFacade } from '../organization/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { AttendanceController } from './attendance/attendance.controller.js';
import { attendanceRoutes } from './attendance/attendance.routes.js';
import { AttendanceService } from './attendance/attendance.service.js';
import { EmployeeController } from './employee/employee.controller.js';
import { EmployeeService } from './employee/employee.service.js';
import { employeeRoutes } from './employee/employee.routes.js';
import { HrFacade } from './hr.facade.js';
import { LeaveController } from './leave/leave.controller.js';
import { leaveRoutes } from './leave/leave.routes.js';
import { LeaveService } from './leave/leave.service.js';
import { PayrollController } from './payroll/payroll.controller.js';
import { payrollRoutes } from './payroll/payroll.routes.js';
import { PayrollService } from './payroll/payroll.service.js';
export interface HrModuleRuntime { readonly plugin: FastifyPluginAsync; readonly facade: HrFacade; }
export function createHrModule(identity: IdentityFacade, organization: OrganizationFacade, numbers: NumberSequenceFacade, approvals: ApprovalFacade, finance: FinanceFacade, access: PlatformAccessFacade): HrModuleRuntime {
  const employeeService = new EmployeeService(identity, organization);
  const attendanceService = new AttendanceService(access);
  const leaveService = new LeaveService(approvals, access);
  const payrollService = new PayrollService(numbers, finance, access);
  const plugin: FastifyPluginAsync = async (app) => {
    await app.register(employeeRoutes(new EmployeeController(employeeService), identity, access));
    await app.register(attendanceRoutes(new AttendanceController(attendanceService), identity, access));
    await app.register(leaveRoutes(new LeaveController(leaveService), identity, access));
    await app.register(payrollRoutes(new PayrollController(payrollService), identity, access));
  };
  return { plugin, facade: new HrFacade(leaveService, payrollService) };
}
