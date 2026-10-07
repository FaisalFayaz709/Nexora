#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const frontendRoot = path.join(repoRoot, 'frontend', 'src');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'frontend', 'package.json'), 'utf8'));
const rootPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

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

function posix(file) {
  return file.split(path.sep).join('/');
}

function rel(file) {
  return posix(path.relative(repoRoot, file));
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function fail(message, details = []) {
  console.error(`PASS R7 TanStack grid gate FAILED: ${message}`);
  for (const detail of details) console.error(` - ${detail}`);
  process.exit(1);
}

const requiredFiles = [
  'frontend/src/components/data/data-table.tsx',
  'frontend/src/components/data/data-toolbar.tsx',
  'frontend/src/components/data/row-actions-menu.tsx',
  'frontend/src/modules/masters/entity-list.tsx',
  'frontend/src/modules/masters/columns.tsx',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) fail('required R7 file is missing', [file]);
}

if (!packageJson.dependencies?.['@tanstack/react-table']) fail('frontend/package.json is missing @tanstack/react-table');

const dataTable = read('frontend/src/components/data/data-table.tsx');
const dataTableRequired = ['useReactTable', 'getCoreRowModel', 'manualPagination', 'manualSorting', 'flexRender', 'DataPagination'];
for (const marker of dataTableRequired) {
  if (!dataTable.includes(marker)) fail('DataTable is missing a required TanStack Table marker', [marker]);
}

const entityList = read('frontend/src/modules/masters/entity-list.tsx');
const entityListRequired = ['DataTable', 'DataToolbar', 'createEntityColumns', 'PaginationState', 'SortingState', 'createNexoraQueryKey'];
for (const marker of entityListRequired) {
  if (!entityList.includes(marker)) fail('EntityList is not using the R7 grid foundation', [marker]);
}
if (entityList.includes('<table')) fail('EntityList still contains a raw HTML table');

const columns = read('frontend/src/modules/masters/columns.tsx');
for (const marker of ['ColumnDef', 'StatusBadge', 'RowActionsMenu', 'stableColumnId', 'createEntityColumns']) {
  if (!columns.includes(marker)) fail('generic module columns are incomplete', [marker]);
}

const allFrontendFiles = walk(frontendRoot).filter((file) => /\.(tsx|ts)$/.test(file));
const rawTables = [];
for (const file of allFrontendFiles) {
  const relFile = rel(file);
  if (relFile === 'frontend/src/components/ui/table.tsx' || relFile === 'frontend/src/components/data/data-table.tsx') continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('<table') || text.includes('<thead') || text.includes('<tbody') || text.includes('<tr') || text.includes('<th') || text.includes('<td')) {
    rawTables.push(relFile);
  }
}
if (rawTables.length > 0) fail('raw hand-built table markup remains outside the approved DataTable/shadcn table components', rawTables);

const moduleDirs = fs.readdirSync(path.join(repoRoot, 'frontend', 'src', 'modules'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !['core', 'navigation', 'workflows', 'e2e-certification', 'release-candidate', 'security-hardening', 'operations', 'testing'].includes(name));
const missingColumnFiles = moduleDirs.filter((name) => !fs.existsSync(path.join(repoRoot, 'frontend', 'src', 'modules', name, 'columns.tsx')));
if (missingColumnFiles.length > 0) fail('module-level columns.tsx files are missing for list-capable modules', missingColumnFiles);

for (const [scriptName, scriptCommand] of Object.entries(rootPackageJson.scripts ?? {})) {
  if (scriptName === 'frontend:tanstack-grids:check' && String(scriptCommand).includes('check-pass-r7-tanstack-grids.mjs')) {
    console.log('PASS R7 TanStack grid source gate passed.');
    process.exit(0);
  }
}
fail('root package.json is missing frontend:tanstack-grids:check script');
