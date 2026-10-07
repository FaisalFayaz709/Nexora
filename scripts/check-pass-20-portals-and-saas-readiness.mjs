#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [], failures = [], blockers = [], warnings = [], limitations = [], gateRuns = [];
function pathOf(p){return join(root,p)}
function hasFile(p){return existsSync(pathOf(p))}
function read(p){return readFileSync(pathOf(p),'utf8')}
function json(p){return JSON.parse(read(p))}
function check(name, passed, message='', options={}){const e={name,passed,message,blocker:Boolean(options.blocker)};checks.push(e);if(!passed){const line=`${name}${message?` — ${message}`:''}`;if(options.blocker) blockers.push(line); else failures.push(line)}}
function includesAll(name, content, required, msg='Missing invariant(s)'){const missing=required.filter(n=>!content.includes(n));check(name,missing.length===0,missing.length?`${msg}: ${missing.join(', ')}`:'')}
function excludesAll(name, content, forbidden, msg='Forbidden invariant(s) found'){const found=forbidden.filter(n=>content.includes(n));check(name,found.length===0,found.length?`${msg}: ${found.join(', ')}`:'')}
function walk(dir){const abs=pathOf(dir);const out=[];if(!existsSync(abs)) return out;for(const name of readdirSync(abs)){if(['node_modules','.next','dist','coverage'].includes(name)) continue;const p=join(abs,name);const st=statSync(p);if(st.isDirectory()) out.push(...walk(relative(root,p).replace(/\\/g,'/')));else out.push(p)}return out}
function runGate(name,args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000});gateRuns.push({name,args,status:r.status??1});check(name,r.status===0,r.status===0?'':`${args.join(' ')} failed with status ${r.status}. ${(r.stderr||r.stdout||'').slice(0,2400)}`)}
function routeSig(method, routePath){return new RegExp(`defineLockedRoute\\(\\s*['"]${method}['"]\\s*,\\s*['"]${routePath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['"]\\s*\\)`)}
function routeIn(text, method, routePath){return routeSig(method, routePath).test(text)}
function previousEvidence(path){if(!hasFile(path)){check(`previous pass evidence exists: ${path}`,false,`${path} is missing.`,{blocker:true});return}let status=read(path);try{const p=JSON.parse(status); status=p.status??p.result??status}catch{};const failed=String(status).includes('FAIL');check(`previous pass evidence is not failed: ${path}`,!failed,`${path} status ${status}.`,{blocker:!sourceOnly&&failed})}
function countPages(){return walk('frontend/src/app').filter(f=>f.endsWith('/page.tsx')||f.endsWith('/page.ts')).length}
function countScreenContracts(){return walk('docs/frontend-screens').filter(f=>f.endsWith('.md')&&!f.endsWith('/index.md')).length}
mkdirSync(pathOf('certification-output'),{recursive:true});
if(!sourceOnly) check('root pnpm-lock.yaml exists for strict runtime certification',hasFile('pnpm-lock.yaml'),'pnpm-lock.yaml is missing; run pnpm install from root and commit lockfile before claiming runtime GO.',{blocker:true});
// Keep this pass certifier lightweight and source-level. The heavyweight gates remain available
// as separate local commands and are listed in PASS_20_GATE_RESULTS.md.
for (const f of ['scripts/check-architecture.mjs','scripts/check-contracts.mjs','scripts/check-route-coverage.mjs','scripts/check-pass-r6-screen-contracts.mjs','scripts/check-pass-19-reporting-search-dashboards.mjs']) {
  check(`supporting source gate exists: ${f}`, hasFile(f), `${f} is required for local full verification.`);
}
const requiredFiles = [
  'backend/src/modules/portals/portal-workspace.routes.ts','backend/src/modules/portals/portal-workspace.controller.ts','backend/src/modules/portals/portal-workspace.service.ts','backend/src/modules/portals/portal-workspace.repository.ts','backend/src/modules/portals/portal-workspace.module.ts',
  'backend/src/modules/saas/saas.routes.ts','backend/src/modules/saas/saas.controller.ts','backend/src/modules/saas/saas.service.ts','backend/src/modules/saas/saas.repository.ts',
  'shared/src/contracts/portal/portal.contracts.ts','shared/src/contracts/platform-ops/platform-ops.contracts.ts','frontend/src/modules/portals/api.ts','frontend/src/modules/portals/portal-resource-config.ts','frontend/src/modules/portals/portal-resource-page.tsx','frontend/src/modules/platform/api.ts','frontend/src/modules/platform/platform-resource-config.ts','frontend/src/modules/forms/resource-form-registry.ts',
];
for(const f of requiredFiles) check(`PASS 20 file exists: ${f}`,hasFile(f),`${f} is required.`);
const portalRoutes = hasFile('backend/src/modules/portals/portal-workspace.routes.ts') ? read('backend/src/modules/portals/portal-workspace.routes.ts') : '';
const requiredPortalRoutes = [
  ['GET','/api/v1/portal/customer/dashboard'],['GET','/api/v1/portal/customer/projects'],['GET','/api/v1/portal/customer/contracts'],['GET','/api/v1/portal/customer/sites'],['GET','/api/v1/portal/customer/assets'],['GET','/api/v1/portal/customer/tickets'],['GET','/api/v1/portal/customer/invoices'],['GET','/api/v1/portal/customer/payments'],['GET','/api/v1/portal/customer/documents'],['POST','/api/v1/portal/customer/tickets'],['POST','/api/v1/portal/customer/work-orders/:id/confirm'],
  ['GET','/api/v1/portal/vendor/dashboard'],['GET','/api/v1/portal/vendor/rfqs'],['GET','/api/v1/portal/vendor/quotations'],['POST','/api/v1/portal/vendor/quotations'],['GET','/api/v1/portal/vendor/purchase-orders'],['POST','/api/v1/portal/vendor/purchase-orders/:id/acknowledge'],['GET','/api/v1/portal/vendor/deliveries'],['GET','/api/v1/portal/vendor/invoices'],['POST','/api/v1/portal/vendor/invoices'],['GET','/api/v1/portal/vendor/payments'],['GET','/api/v1/portal/vendor/performance'],['GET','/api/v1/portal/vendor/documents'],
  ['GET','/api/v1/portal/technician/dashboard'],['GET','/api/v1/portal/technician/jobs'],['GET','/api/v1/portal/technician/work-orders/:id'],['POST','/api/v1/portal/technician/work-orders/:id/accept'],['POST','/api/v1/portal/technician/work-orders/:id/start-travel'],['POST','/api/v1/portal/technician/work-orders/:id/arrive'],['POST','/api/v1/portal/technician/work-orders/:id/check-in'],['POST','/api/v1/portal/technician/work-orders/:id/location'],['POST','/api/v1/portal/technician/work-orders/:id/start'],['POST','/api/v1/portal/technician/work-orders/:id/service-report'],['POST','/api/v1/portal/technician/work-orders/:id/check-out'],['POST','/api/v1/portal/technician/work-orders/:id/complete'],['GET','/api/v1/portal/technician/offline-queue'],
];
for(const [m,p] of requiredPortalRoutes) check(`PASS 20 portal route exists: ${m} ${p}`,routeIn(portalRoutes,m,p),`${m} ${p} missing.`);
includesAll('Portal routes enforce auth, tenant, module and permission guards', portalRoutes, ['authenticateRequest','resolveTenantRequest',"assertModuleEnabled(request.tenant!.organizationId, 'portals')",'customer.view','vendor.view','workorder.view','defineLockedRoute']);
excludesAll('Portal routes/controllers do not access Prisma directly', portalRoutes + (hasFile('backend/src/modules/portals/portal-workspace.controller.ts')?read('backend/src/modules/portals/portal-workspace.controller.ts'):''), ['@nexora/database','prisma.']);
const portalService = hasFile('backend/src/modules/portals/portal-workspace.service.ts') ? read('backend/src/modules/portals/portal-workspace.service.ts') : '';
includesAll('Portal service enforces linked-record/assigned technician/audit rules', portalService, ['assertCustomerPortalScope','assertVendorPortalScope','assertTechnicianWorkOrderScope','assertPwaEvidenceUsesDocumentStorage','CUSTOMER_PORTAL_TICKET_CREATED','VENDOR_PORTAL_QUOTATION_SUBMITTED','TECHNICIAN_PORTAL_','withTransaction','AuditWriter']);
const saasRoutes = hasFile('backend/src/modules/saas/saas.routes.ts') ? read('backend/src/modules/saas/saas.routes.ts') : '';
const requiredSaasRoutes = [['GET','/api/v1/saas/plans'],['POST','/api/v1/saas/plans'],['GET','/api/v1/saas/plans/:id'],['PATCH','/api/v1/saas/plans/:id'],['GET','/api/v1/saas/subscriptions'],['POST','/api/v1/saas/subscriptions'],['GET','/api/v1/saas/subscriptions/:id'],['PATCH','/api/v1/saas/subscriptions/:id'],['GET','/api/v1/saas/usage'],['GET','/api/v1/saas/usage/:id'],['POST','/api/v1/saas/usage/collect'],['GET','/api/v1/saas/invoices'],['POST','/api/v1/saas/invoices'],['GET','/api/v1/saas/invoices/:id'],['PATCH','/api/v1/saas/invoices/:id'],['POST','/api/v1/saas/invoices/:id/post']];
for(const [m,p] of requiredSaasRoutes) check(`PASS 20 SaaS route exists: ${m} ${p}`,routeIn(saasRoutes,m,p),`${m} ${p} missing.`);
includesAll('SaaS service covers plans/subscriptions/usage/storage/invoices/audit', hasFile('backend/src/modules/saas/saas.service.ts')?read('backend/src/modules/saas/saas.service.ts'):'', ['SAAS_PLAN_CREATED','SAAS_SUBSCRIPTION_CREATED','SAAS_USAGE_COLLECTED','tenantStorageUsage','SAAS_INVOICE_CREATED','SAAS_INVOICE_POSTED','Posted SaaS invoices cannot be silently edited']);
const sharedPortal = hasFile('shared/src/contracts/portal/portal.contracts.ts')?read('shared/src/contracts/portal/portal.contracts.ts'):'';
includesAll('Shared portal contracts cover customer/vendor/technician portal commands', sharedPortal, ['CustomerPortalCreateTicketSchema','CustomerPortalConfirmWorkOrderSchema','VendorPortalSubmitQuotationSchema','VendorPortalAcknowledgePurchaseOrderSchema','VendorPortalSubmitInvoiceSchema','TechnicianPortalCommandSchema','PortalWorkspaceContract']);
const sharedOps = hasFile('shared/src/contracts/platform-ops/platform-ops.contracts.ts')?read('shared/src/contracts/platform-ops/platform-ops.contracts.ts'):'';
includesAll('Shared SaaS contracts cover plans, subscriptions, usage and invoices', sharedOps, ['CreateSaaSPlanSchema','UpdateSaaSPlanSchema','CreateSaaSSubscriptionSchema','UpdateSaaSSubscriptionSchema','SaaSUsageCollectionSchema','CreateSaaSInvoiceSchema','UpdateSaaSInvoiceSchema','SaaSReadinessContract']);
const portalApi = hasFile('frontend/src/modules/portals/api.ts')?read('frontend/src/modules/portals/api.ts'):'';
includesAll('Frontend portal API covers all linked portal/PWA surfaces through centralized client', portalApi, ['customerDashboard','customerProjects','vendorDashboard','vendorRfqs','technicianDashboard','technicianJobs','technicianOfflineQueue','syncTechnicianOffline','createCustomerTicket','submitVendorQuotation','submitVendorInvoice','Fastify /api/v1']);
excludesAll('Frontend portal API has no raw fetch', portalApi, ['fetch(']);
const platformApi = hasFile('frontend/src/modules/platform/api.ts')?read('frontend/src/modules/platform/api.ts'):'';
includesAll('Frontend platform API includes SaaS invoices and usage collection helpers', platformApi, ['saasPlans','saasSubscriptions','saasUsage','saasUsageCollect','saasInvoices','collectSaaSUsage','postSaaSInvoice']);
const formRegistry = hasFile('frontend/src/modules/forms/resource-form-registry.ts')?read('frontend/src/modules/forms/resource-form-registry.ts'):'';
includesAll('Resource form registry includes SaaS RHF/Zod forms', formRegistry, ["'/saas/plans'","'/saas/subscriptions'","'/saas/invoices'",'CreateSaaSPlanSchema','CreateSaaSSubscriptionSchema','CreateSaaSInvoiceSchema']);
const routeMap = hasFile('frontend/src/lib/route-map.ts')?read('frontend/src/lib/route-map.ts'):'';
includesAll('Route map includes portal/PWA/SaaS route families with correct Fastify endpoints', routeMap, ['/customer-portal/projects','/vendor-portal/rfqs','/technician-pwa/jobs','/saas/plans','/saas/subscriptions','/saas/usage','/saas/invoices',"backendEndpoints: ['/saas/plans']"]);
const appTs = hasFile('backend/src/app.ts')?read('backend/src/app.ts'):'';
includesAll('Backend app registers portal workspace module', appTs, ['createPortalWorkspaceModule','portalWorkspace.plugin']);
const locked = hasFile('shared/src/contracts/registry/locked-endpoints.json')?json('shared/src/contracts/registry/locked-endpoints.json'):[];
for(const [m,p] of [...requiredPortalRoutes,...requiredSaasRoutes]) check(`Locked endpoint registry includes ${m} ${p}`, locked.some(r=>r.method===m&&r.endpoint===p), `${m} ${p} missing from locked endpoint registry.`);
check('Locked endpoint registry count is at least 355 after Pass 20', locked.length >= 355, `Expected at least 355, found ${locked.length}.`);
const contractLock = hasFile('docs/contracts/contract-lock.json')?json('docs/contracts/contract-lock.json'):{};
check('Contract lock records Pass 20 endpoint count', Number(contractLock.endpointCatalogCount??0) >= 355, `endpointCatalogCount=${contractLock.endpointCatalogCount}`);
check('Contract lock records Pass 20 reconciliation marker', String(contractLock.lastImplementationStatusReconciliation??'').includes('PASS_20_PORTALS_AND_SAAS_READINESS'), `marker=${contractLock.lastImplementationStatusReconciliation}`);
check('Screen contracts cover active frontend routes after Pass 20', countScreenContracts() >= countPages(), `screenContracts=${countScreenContracts()}, pages=${countPages()}`);
if(!hasFile('pnpm-lock.yaml')) warnings.push('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected local machine.');
limitations.push('This certification is source-level unless run without --source-only after pnpm-lock.yaml exists.');
limitations.push('Runtime portal auth, Fastify API boot, Next.js build, migrations, seed, Docker, worker jobs and browser E2E remain local-machine gates.');
const status = blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : failures.length ? 'FAIL_SOURCE_LEVEL' : (warnings.length ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_SOURCE_LEVEL');
const result = {pass:'PASS_20_PORTALS_AND_SAAS_READINESS', status, sourceOnly, checksRun:checks.length, passed:checks.filter(c=>c.passed).length, blockers, failures, warnings, limitations, counts:{endpointRegistryCount:locked.length,nextPageRoutes:countPages(),screenContracts:countScreenContracts(),portalRoutes:requiredPortalRoutes.length,saasRoutes:requiredSaasRoutes.length}, gateRuns, checks};
writeFileSync(pathOf('certification-output/pass-20-portals-and-saas-readiness.json'), JSON.stringify(result,null,2)+'\n');
if(blockers.length||failures.length){console.error(`PASS 20 failed: ${blockers.length} blocker(s), ${failures.length} failure(s).`); for(const item of [...blockers,...failures]) console.error(`- ${item}`); process.exit(1)}
console.log(JSON.stringify(result,null,2));
