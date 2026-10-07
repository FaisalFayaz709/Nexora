import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { PortalWorkspaceController } from './portal-workspace.controller.js';
import { portalWorkspaceRoutes } from './portal-workspace.routes.js';
import { PortalWorkspaceService } from './portal-workspace.service.js';

export interface PortalWorkspaceModuleRuntime { readonly plugin: FastifyPluginAsync; }

export function createPortalWorkspaceModule(identity: IdentityFacade, access: PlatformAccessFacade): PortalWorkspaceModuleRuntime {
  const service = new PortalWorkspaceService();
  return { plugin: portalWorkspaceRoutes(new PortalWorkspaceController(service), identity, access) };
}
