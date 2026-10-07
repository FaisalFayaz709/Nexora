import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ApprovalController } from './approval.controller.js';
import { ApprovalFacade } from './approval.facade.js';
import { approvalRoutes } from './approval.routes.js';
import { ApprovalService } from './approval.service.js';
import { ApprovalSubjectRegistry } from './approval-subject.registry.js';

export interface ApprovalModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: ApprovalFacade;
}

export function createApprovalModule(
  identity: IdentityFacade,
  access: PlatformAccessFacade,
  subjects: ApprovalSubjectRegistry,
): ApprovalModuleRuntime {
  const service = new ApprovalService(identity, access, subjects);
  return {
    plugin: approvalRoutes(new ApprovalController(service), identity, access),
    facade: new ApprovalFacade(service),
  };
}
