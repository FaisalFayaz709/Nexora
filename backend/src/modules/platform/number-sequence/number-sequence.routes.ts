import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { NumberSequenceController } from './number-sequence.controller.js';
const list=defineLockedRoute('GET','/api/v1/number-sequences');
const create=defineLockedRoute('POST','/api/v1/number-sequences');
const reset=defineLockedRoute('POST','/api/v1/number-sequences/:id/reset');
export function numberSequenceRoutes(controller:NumberSequenceController,identity:IdentityFacade):FastifyPluginAsync{
 const admin=[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),(request:FastifyRequest)=>identity.assertPermission(request,'number_sequence.manage')];
 return async(app)=>{app.get(list.relativePath, { schema: list.schema,preHandler:admin,handler:controller.list});app.post(create.relativePath, { schema: create.schema,preHandler:admin,handler:controller.create});app.post(reset.relativePath, { schema: reset.schema,preHandler:admin,handler:controller.reset});};
}
