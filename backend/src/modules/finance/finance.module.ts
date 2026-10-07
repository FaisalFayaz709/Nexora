import type { FastifyPluginAsync } from 'fastify';
import type { ApprovalFacade } from '../approvals/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import type { ProjectFacade } from '../projects/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import { FinanceController } from './finance.controller.js';
import { FinanceFacade } from './finance.facade.js';
import { financeRoutes } from './finance.routes.js';
import { FinanceService } from './finance.service.js';

export interface FinanceModuleRuntime { readonly plugin: FastifyPluginAsync; readonly facade: FinanceFacade; }

export function createFinanceModule(identity: IdentityFacade, numbers: NumberSequenceFacade, approvals: ApprovalFacade, customers: CustomerFacade, employees: EmployeeFacade, vendors: VendorGovernanceFacade, projects: ProjectFacade, procurement: ProcurementFacade, access: PlatformAccessFacade): FinanceModuleRuntime {
  const service = new FinanceService(numbers, approvals, customers, employees, vendors, projects, procurement, access);
  return { plugin: financeRoutes(new FinanceController(service), identity, access), facade: new FinanceFacade(service) };
}
