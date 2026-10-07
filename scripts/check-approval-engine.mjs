import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();const failures=[];
const prior=spawnSync(process.execPath,['scripts/check-procurement.mjs'],{stdio:'inherit'});
if(prior.status!==0)process.exit(prior.status??1);

const lock=JSON.parse(readFileSync(join(root,'docs/contracts/capability-locks/approval-engine.json'),'utf8'));
const catalog=readFileSync(join(root,'docs/contracts/api-endpoint-matrix.csv'),'utf8');
const routes=readFileSync(join(root,'backend/src/modules/approvals/approval.routes.ts'),'utf8');

for(const route of lock.implementedLockedRoutes){
  const sig=`defineLockedRoute('${route.method}', '${route.path}')`;
  if(!routes.includes(sig))failures.push(`Missing locked route ${route.method} ${route.path}`);
  if(!catalog.includes(route.path))failures.push(`Route absent frozen catalog ${route.path}`);
  if(!routes.includes(`'${route.permission}'`))failures.push(`Permission guard absent ${route.permission}`);
}
const routeMatches=[...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g)].map(m=>`${m[1]} ${m[2]}`);
if(new Set(routeMatches).size!==lock.routeCount)failures.push(`Expected ${lock.routeCount} approval routes, got ${new Set(routeMatches).size}`);

const schema=readFileSync(join(root,'database/prisma/schema.prisma'),'utf8');
for(const model of lock.newPhysicalModels)if(!new RegExp(`model\\s+${model}\\s*\\{`).test(schema))failures.push(`Missing model ${model}`);
if(/\bFloat\b/.test(schema))failures.push('Float introduced into Prisma schema.');

const migration=readFileSync(join(root,'database/prisma/migrations/20260903000200_pass8_approval_engine/migration.sql'),'utf8');
for(const x of [
  "'PENDING','IN_PROGRESS','APPROVED','REJECTED','RETURNED','CANCELLED'",
  "'USER','ROLE'",
  "'WAITING','PENDING','APPROVED','REJECTED','RETURNED','CANCELLED'",
  "'APPROVE','REJECT','RETURN'",
  'CREATE TRIGGER "ApprovalAction_immutable"',
  'ApprovalAction_approvalStepId_actorId_key'
])if(!migration.includes(x))failures.push(`Migration invariant missing ${x}`);

const service=readFileSync(join(root,'backend/src/modules/approvals/approval.service.ts'),'utf8');
const policy=readFileSync(join(root,'backend/src/modules/approvals/approval-engine-policy.ts'),'utf8');
const policyInvariantTest=readFileSync(join(root,'backend/src/modules/approvals/approval-engine-policy-invariants.test.ts'),'utf8');
const approvalSource=`${service}
${policy}
${policyInvariantTest}`;
for(const x of [
  'APPROVAL_DEFINITION_NOT_CONFIGURED_OR_MATCHED',
  'APPROVAL_DEFINITION_AMBIGUOUS',
  'MAKER_CHECKER_VIOLATION',
  'APPROVAL_ACTOR_NOT_ELIGIBLE',
  'APPROVAL_ACTOR_ALREADY_ACTED',
  'APPROVAL_REJECTION_COMMENT_REQUIRED',
  'approvalCount',
  'activateStep',
  'subjects.applyDecision'
])if(!approvalSource.includes(x))failures.push(`Approval engine invariant missing ${x}`);
for(const x of ['MAKER_CHECKER_VIOLATION','APPROVAL_REJECTION_COMMENT_REQUIRED']){
  if(!policyInvariantTest.includes(x))failures.push(`Approval policy invariant test missing ${x}`);
}
for(const fileSource of [service,policy]){
  if(fileSource.includes('BullMQ')||fileSource.includes("from 'bullmq'"))failures.push('Approval state cannot use BullMQ.');
}

const procurement=readFileSync(join(root,'backend/src/modules/procurement/procurement.service.ts'),'utf8');
for(const x of [
  "subjectType:'PurchaseRequest'",
  "subjectType:'PurchaseOrder'",
  'this.approvals.requestApproval',
  'this.approvals.actBySubject',
  'applyApprovalDecision',
  "'UNDER_REVIEW'",
  "'APPROVAL_PENDING'"
])if(!procurement.includes(x))failures.push(`Procurement approval integration missing ${x}`);

const facade=readFileSync(join(root,'backend/src/modules/procurement/procurement.facade.ts'),'utf8');
if(!facade.includes('implements ApprovalSubjectHandler'))failures.push('Procurement public facade is not an approval subject handler.');

const app=readFileSync(join(root,'backend/src/app.ts'),'utf8');
for(const x of [
  'createApprovalModule(',
  "approvalSubjects.register('PurchaseRequest', procurement.facade)",
  "approvalSubjects.register('PurchaseOrder', procurement.facade)",
  'app.register(approvals.plugin'
])if(!app.includes(x))failures.push(`Approval app composition missing ${x}`);

for(const f of ['frontend/src/app/(erp)/approvals/page.tsx','frontend/src/app/(erp)/approval-definitions/page.tsx']){
  if(!existsSync(join(root,f)))failures.push(`Missing approval frontend ${f}`);
}

if(failures.length){
  console.error('Approval-engine gate FAILED');
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`Approval-engine gate PASSED: ${lock.routeCount} exact locked Approval routes and ${lock.newPhysicalModelCount} Approval models.`);
