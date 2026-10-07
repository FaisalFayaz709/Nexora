#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, 'frontend', 'src', 'app');
const contractRoot = path.join(repoRoot, 'docs', 'frontend-screens');
const requiredFiles = [
  'docs/frontend-screens/index.md',
  'docs/frontend-screens/_screen-contract-template.md',
];

const requiredSections = [
  '## Route and owner',
  '## Purpose',
  '## Permissions',
  '## API mapping',
  '## Data table spec',
  '## Form spec',
  '## Workflow commands and row actions',
  '## State model',
  '## Responsive behavior',
  '## Audit/traceability',
  '## Acceptance checks',
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function routeInfo(pagePath) {
  const rel = toPosix(path.relative(appRoot, pagePath));
  const parts = rel.split('/').slice(0, -1);
  let routeGroup = '(erp)';
  let routeParts = parts;
  if (parts[0]?.startsWith('(')) {
    routeGroup = parts[0];
    routeParts = parts.slice(1);
  }
  const route = `/${routeParts.join('/')}`.replace(/\/$/, '') || '/';
  return { routeGroup, route, relSource: toPosix(path.relative(repoRoot, pagePath)) };
}

function contractFileName(routeGroup, route) {
  const group = routeGroup.replace(/[()]/g, '');
  if (route === '/') return `${group}-root.md`;
  return `${group}-${route.slice(1).replaceAll('/', '--').replace(/[\[\]]/g, '').replaceAll('...', 'catchall')}.md`;
}

function fail(message, details = []) {
  console.error(`PASS R6 screen-contract gate FAILED: ${message}`);
  for (const detail of details) console.error(` - ${detail}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) fail('required R6 file is missing', [file]);
}

const pageFiles = walk(appRoot).filter((file) => path.basename(file) === 'page.tsx').sort();
if (pageFiles.length === 0) fail('no Next.js route pages were discovered under frontend/src/app');

const indexText = fs.readFileSync(path.join(contractRoot, 'index.md'), 'utf8');
const seenContracts = new Set();
const failures = [];

for (const pageFile of pageFiles) {
  const { routeGroup, route, relSource } = routeInfo(pageFile);
  const name = contractFileName(routeGroup, route);
  const contractPath = path.join(contractRoot, name);
  const relContract = toPosix(path.relative(repoRoot, contractPath));
  seenContracts.add(name);

  if (!fs.existsSync(contractPath)) {
    failures.push(`missing contract for ${relSource}: expected ${relContract}`);
    continue;
  }

  const text = fs.readFileSync(contractPath, 'utf8');
  if (!text.includes(`# Screen Contract`)) failures.push(`${relContract}: missing Screen Contract title`);
  if (!text.includes(`Route path: \`${route}\``)) failures.push(`${relContract}: route path does not match ${route}`);
  if (!text.includes(`Route group: \`${routeGroup}\``)) failures.push(`${relContract}: route group does not match ${routeGroup}`);
  if (!text.includes(`Source page file: \`${relSource}\``)) failures.push(`${relContract}: source page file does not match ${relSource}`);
  for (const section of requiredSections) {
    if (!text.includes(section)) failures.push(`${relContract}: missing section ${section}`);
  }

  if (!text.includes('Fastify `/api/v1`')) failures.push(`${relContract}: must preserve Fastify /api/v1 business API rule`);
  if (!text.includes('React Hook Form')) failures.push(`${relContract}: must define React Hook Form form standard`);
  if (!text.includes('Zod')) failures.push(`${relContract}: must define Zod validation standard`);
  if (!text.includes('TanStack Table')) failures.push(`${relContract}: must define TanStack Table grid standard`);
  if (!text.includes('tenant')) failures.push(`${relContract}: must mention tenant scope/security`);
  if (!text.includes('audit')) failures.push(`${relContract}: must mention audit/traceability`);
  if (!indexText.includes(`](${name})`)) failures.push(`index.md does not link ${name}`);
}

const contractFiles = fs.readdirSync(contractRoot).filter((name) => name.endsWith('.md') && !name.startsWith('_') && name !== 'index.md');
const staleContracts = contractFiles.filter((name) => !seenContracts.has(name));
if (staleContracts.length) failures.push(`stale contract files not mapped to active page routes: ${staleContracts.join(', ')}`);

if (failures.length) fail(`${failures.length} issue(s) found`, failures.slice(0, 80));

console.log(`PASS R6 screen-contract gate passed for ${pageFiles.length} frontend route page(s).`);
console.log('Every current page has a matching docs/frontend-screens contract with required Appendix G sections.');
