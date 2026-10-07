import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd(); const failures=[];
const prior=spawnSync(process.execPath,['scripts/check-assets.mjs'],{stdio:'inherit'});
if(prior.status!==0) process.exit(prior.status??1);
const lock=JSON.parse(readFileSync(join(root,'docs/contracts/capability-locks/field-service.json'),'utf8'));
const catalog=readFileSync(join(root,'docs/contracts/api-endpoint-matrix.csv'),'utf8');
const routes=readFileSync(join(root,'backend/src/modules/service/field-service.routes.ts'),'utf8');
for(const route of lock.lockedRoutes){
  const escaped=route.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const routePattern=new RegExp(`defineLockedRoute\\(\\s*'${route.method}'\\s*,\\s*'${escaped}'\\s*\\)`);
  if(!routePattern.test(routes)) failures.push(`Missing locked Field Service route: ${route.method} ${route.path}`);
  if(!catalog.includes(route.path)) failures.push(`Field Service route absent frozen catalog: ${route.path}`);
  if(route.permission!=='TECHNICIAN_ONLY_SCOPE'&&!routes.includes(`'${route.permission}'`)) failures.push(`Permission guard missing: ${route.permission}`);
}
const routeMatches=[...routes.matchAll(/defineLockedRoute\(\s*'([A-Z]+)'\s*,\s*'([^']+)'\s*\)/g)].map(m=>`${m[1]} ${m[2]}`);
if(new Set(routeMatches).size!==lock.lockedRouteCount) failures.push(`Expected ${lock.lockedRouteCount} unique Field Service routes; found ${new Set(routeMatches).size}`);
if(routes.includes("'technician.location.manage'")) failures.push('Do not invent technician.location.manage on blank-permission technician mutation routes.');
const schema=readFileSync(join(root,'database/prisma/schema.prisma'),'utf8');
for(const model of lock.newPhysicalModels) if(!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing model: ${model}`);
if(/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');
const migration=readFileSync(join(root,'database/prisma/migrations/20260903000500_pass11_field_service/migration.sql'),'utf8');
for(const x of [
  "'OPEN','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','WAITING_VENDOR'",
  "'NEW','VALIDATED','ASSIGNED','TECHNICIAN_ACCEPTED','TRAVELLING','ON_SITE'",
  "'AVAILABLE','ASSIGNED','ON_SITE','ON_LEAVE','OFF_DUTY'",
  'SlaPolicy_organizationId_priority_key','Ticket_organizationId_ticketNo_key','WorkOrder_organizationId_workOrderNo_key',
  'ServiceReportPart_stockTransactionId_key','ServiceReportPart_qty_check','TechnicianLocationPing_lat_check','TechnicianLocationPing_lon_check','ServiceVisitLocation_pair_check'
]) if(!migration.includes(x)) failures.push(`Migration invariant missing: ${x}`);
const service=readFileSync(join(root,'backend/src/modules/service/field-service.service.ts'),'utf8');
const workflowPolicy=readFileSync(join(root,'backend/src/modules/service/field-service-workflow-policy.ts'),'utf8');
const completionPolicy=readFileSync(join(root,'backend/src/modules/service/field-service-completion-policy.ts'),'utf8');
const serviceBoundarySource=[service,workflowPolicy,completionPolicy].join('\n');
const serviceBoundaryCompact=serviceBoundarySource.replace(/\s+/g,'');
for(const x of ["entityType: 'TICKET'","entityType: 'WORK_ORDER'","type: 'ticket.created'","type: 'work_order.assigned'","type: 'work_order.completed'",'TICKET_INVALID_STATE_TRANSITION','WORK_ORDER_TECHNICIAN_SCOPE_DENIED','WORK_ORDER_CUSTOMER_CONFIRMATION_REQUIRED','this.inventory.consumeServicePart','this.assets.recordFieldServiceCompletion','SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW','WORK_ORDER_CHECKOUT_REQUIRED','technicianVisitPolicy','TECHNICIAN_LOCATION_COLLECTION_DISABLED','purgeExpiredLocationData']) if(!serviceBoundaryCompact.includes(x.replace(/\s+/g,''))) failures.push(`Service boundary invariant missing: ${x}`);
if(service.includes('BullMQ')||service.includes("from 'bullmq'")) failures.push('Critical Field Service state must not use BullMQ.');
const inv=readFileSync(join(root,'backend/src/modules/inventory/inventory.facade.ts'),'utf8');
for(const x of ['consumeServicePart',"'TECHNICIAN_ISSUE'",'lockBatchForService','SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW','linkTransactionBatches']) if(!inv.includes(x)) failures.push(`Inventory integration missing: ${x}`);
const asset=readFileSync(join(root,'backend/src/modules/assets/asset.facade.ts'),'utf8'); if(!asset.includes('recordFieldServiceCompletion')) failures.push('Asset public facade lacks Field Service integration.');
const module=readFileSync(join(root,'backend/src/modules/service/field-service.module.ts'),'utf8');
for(const x of ["type { AssetFacade } from '../assets/index.js'","type { CustomerFacade } from '../customers/index.js'","type { EmployeeFacade } from '../hr/index.js'","type { InventoryFacade } from '../inventory/index.js'"]) if(!module.includes(x)) failures.push(`Public facade boundary missing: ${x}`);
const app=readFileSync(join(root,'backend/src/app.ts'),'utf8');
for(const x of ['createFieldServiceModule(','assets.facade','inventory.facade','app.register(fieldService.plugin']) if(!app.includes(x)) failures.push(`App composition missing: ${x}`);
for(const f of ['backend/src/modules/service/field-service.repository.ts','backend/src/modules/service/field-service.service.ts','backend/src/modules/service/field-service.controller.ts','backend/src/modules/service/field-service.routes.ts','backend/src/modules/service/field-service.facade.ts','backend/src/modules/service/field-service.module.ts','frontend/src/app/(erp)/tickets/page.tsx','frontend/src/app/(erp)/work-orders/page.tsx']) if(!existsSync(join(root,f))) failures.push(`Missing file: ${f}`);
if(failures.length){console.error('Field-service gate FAILED'); for(const f of failures) console.error(`- ${f}`); process.exit(1);}
console.log(`Field-service gate PASSED: ${lock.coreServiceRouteCount} core Service routes + ${lock.appendixFTechnicianVisitRouteCount} technician-visit routes and ${lock.newPhysicalModelCount} Field Service models.`);
