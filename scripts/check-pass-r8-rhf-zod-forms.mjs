#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const requiredFiles = [
  'frontend/src/components/forms/form-shell.tsx',
  'frontend/src/components/forms/resource-form-types.ts',
  'frontend/src/components/forms/resource-form-fields.tsx',
  'frontend/src/components/forms/resource-form-dialog.tsx',
  'frontend/src/components/forms/command-form-dialog.tsx',
  'frontend/src/components/forms/validation-errors.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/modules/masters/entity-list.tsx',
];

const failures = [];
function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}
function assertContains(rel, text, label = text) {
  const value = read(rel);
  if (!value.includes(text)) failures.push(`${rel} does not contain ${label}`);
}
function listFiles(dir, exts = ['.ts', '.tsx']) {
  const full = path.join(root, dir);
  const results = [];
  if (!fs.existsSync(full)) return results;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listFiles(rel, exts));
    else if (exts.includes(path.extname(entry.name))) results.push(rel);
  }
  return results;
}

for (const file of requiredFiles) read(file);

const frontendPkg = JSON.parse(read('frontend/package.json') || '{}');
for (const dep of ['react-hook-form', '@hookform/resolvers', 'zod', '@tanstack/react-query']) {
  if (!frontendPkg.dependencies?.[dep] && !frontendPkg.devDependencies?.[dep]) failures.push(`frontend/package.json missing ${dep}`);
}

assertContains('frontend/src/components/forms/form-shell.tsx', 'FormProvider', 'RHF FormProvider wrapper');
assertContains('frontend/src/components/forms/resource-form-dialog.tsx', 'useForm<', 'typed useForm in resource dialog');
assertContains('frontend/src/components/forms/resource-form-dialog.tsx', 'zodResolver', 'zodResolver in resource dialog');
assertContains('frontend/src/components/forms/resource-form-dialog.tsx', 'useMutation', 'TanStack Query mutation in resource dialog');
assertContains('frontend/src/components/forms/resource-form-dialog.tsx', 'queryClient.invalidateQueries', 'mutation invalidation in resource dialog');
assertContains('frontend/src/components/forms/command-form-dialog.tsx', 'useForm<', 'typed useForm in command dialog');
assertContains('frontend/src/components/forms/command-form-dialog.tsx', 'zodResolver', 'zodResolver in command dialog');
assertContains('frontend/src/components/forms/command-form-dialog.tsx', 'createIdempotencyKey', 'idempotency key creation for command forms');
assertContains('frontend/src/components/forms/controlled-fields.tsx', 'Controller', 'Controller for controlled shadcn fields');
assertContains('frontend/src/components/forms/validation-errors.ts', 'setError', 'backend validation mapped to RHF field errors');
assertContains('frontend/src/modules/forms/resource-form-registry.ts', '@nexora/shared', 'shared browser-safe Zod contracts imported');
assertContains('frontend/src/modules/forms/resource-form-registry.ts', 'ResourceFormRegistry', 'resource form registry');
assertContains('frontend/src/modules/forms/resource-form-registry.ts', 'CommandFormRegistry', 'command form registry');
assertContains('frontend/src/modules/masters/entity-list.tsx', '<ResourceFormDialog', 'list pages open RHF/Zod create/edit dialogs');
assertContains('frontend/src/modules/masters/entity-list.tsx', 'setEditingRow', 'edit form flow from row action');

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
const requiredEndpoints = [
  '/customers', '/vendors', '/employees', '/products', '/warehouses', '/branches', '/departments',
  '/purchase-requests', '/rfqs', '/supplier-quotations', '/purchase-orders', '/goods-receipts',
  '/projects', '/project-tasks', '/tickets', '/work-orders', '/customer-invoices', '/supplier-invoices',
  '/payments', '/expenses', '/stock-counts', '/maintenance/plans', '/vendor-onboarding/requests',
  '/inventory/reservations', '/inventory/transfers', '/inventory/adjustments', '/tax-rules', '/number-sequences'
];
for (const endpoint of requiredEndpoints) {
  if (!registry.includes(`endpoint: '${endpoint}'`) && !registry.includes(`endpoint: \`${endpoint}\``)) failures.push(`ResourceFormRegistry missing endpoint ${endpoint}`);
}

const forbiddenFormOwners = listFiles('frontend/src').filter((rel) => !rel.startsWith('frontend/src/components/forms/'));
for (const rel of forbiddenFormOwners) {
  const value = read(rel);
  if (/<form\b/.test(value)) failures.push(`Raw <form> found outside RHF FormShell: ${rel}`);
}

const components = listFiles('frontend/src/app').concat(listFiles('frontend/src/modules'));
for (const rel of components) {
  const value = read(rel);
  if (/apiPatch\s*<[^>]*>\([^)]*status/.test(value) || /method:\s*['"]PATCH['"][\s\S]{0,240}status/.test(value)) {
    failures.push(`Potential free status PATCH implementation found: ${rel}`);
  }
}

const packageJson = JSON.parse(read('package.json') || '{}');
for (const script of ['frontend:forms:check', 'pass:r8:source-check', 'pass:r8:certify']) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json missing script ${script}`);
}

if (!sourceOnly && !fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
  failures.push('Runtime certification requires pnpm-lock.yaml. Run pass R1 locally and commit the generated lockfile.');
}

if (failures.length) {
  console.error(JSON.stringify({ pass: 'R8', status: 'FAIL', sourceOnly, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: 'R8',
  status: sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_PENDING_RUNTIME_INSTALL',
  sourceOnly,
  checks: {
    requiredFiles: requiredFiles.length,
    requiredResourceEndpoints: requiredEndpoints.length,
    rhf: true,
    zodResolver: true,
    tanstackMutationInvalidation: true,
    idempotencyAwareCommandForms: true,
    rawFormsOutsideFormShell: 0,
  },
  remainingLimits: [
    'Full module-specific field arrays, pickers, detail pages and command panels remain in R9-R16.',
    'Typecheck/build/runtime certification still requires local pnpm lockfile and dependency install.',
  ],
}, null, 2));
