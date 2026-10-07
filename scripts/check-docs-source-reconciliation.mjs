import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); if (row.some((cell) => cell.length > 0)) rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); if (row.some((cell) => cell.length > 0)) rows.push(row); }
  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])));
}

function routes() {
  const routePattern = /defineLockedRoute\(\s*['"]([A-Z]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  const out = [];
  for (const file of walk(join(root, 'backend/src/modules')).filter((candidate) => candidate.endsWith('.routes.ts'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(routePattern)) out.push({ method: match[1], endpoint: match[2], file: relative(root, file) });
  }
  return out;
}

const apiRows = parseCsv(readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8'));
const routeSet = new Set(routes().map((route) => `${route.method} ${route.endpoint}`));
for (const row of apiRows) {
  const expected = routeSet.has(`${row.method} ${row.endpoint}`) ? 'IMPLEMENTED_STATIC_ONLY' : 'NOT_IMPLEMENTED';
  if (row.status !== expected) failures.push(`API matrix stale: ${row.method} ${row.endpoint} expected ${expected}, got ${row.status}`);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
const modelSet = new Set([...schema.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{/gm)].map((match) => match[1]));
const dbRows = parseCsv(readFileSync(join(root, 'docs/traceability/database-entity-matrix.csv'), 'utf8'));
for (const row of dbRows) {
  const expected = modelSet.has(row.entity) ? 'IMPLEMENTED_STATIC_ONLY' : 'NOT_IMPLEMENTED';
  if (row.implementation_state !== expected) failures.push(`DB matrix stale: ${row.entity} expected ${expected}, got ${row.implementation_state}`);
}

const allowedFunctional = new Set(['IMPLEMENTED_STATIC_ONLY', 'PARTIAL', 'NOT_IMPLEMENTED', 'SOURCE_REFERENCE_ONLY']);
const functionalRows = parseCsv(readFileSync(join(root, 'docs/traceability/functional-scope-matrix.csv'), 'utf8'));
for (const row of functionalRows) {
  if (!allowedFunctional.has(row.implementation_state)) failures.push(`Functional matrix has unsupported state for ${row.requirement_id}: ${row.implementation_state}`);
}

for (const rel of [
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/api-endpoint-matrix.md',
  'docs/traceability/database-entity-matrix.csv',
  'docs/traceability/database-entity-matrix.md',
  'docs/traceability/functional-scope-matrix.csv',
  'docs/traceability/functional-scope.md',
]) {
  const text = readFileSync(join(root, rel), 'utf8');
  if (/LOCKED_NOT_IMPLEMENTED|NOT_STARTED/.test(text)) failures.push(`Stale implementation marker remains in ${rel}`);
}

for (const required of [
  'scripts/reconcile-docs-with-source.mjs',
]) {
  if (!existsSync(join(root, required))) failures.push(`Missing M3 reconciliation artifact: ${required}`);
}

mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/docs-source-reconciliation-check.json'), JSON.stringify({
  apiRows: apiRows.length,
  routeSignatures: routeSet.size,
  databaseRows: dbRows.length,
  prismaModels: modelSet.size,
  functionalRows: functionalRows.length,
  failures,
}, null, 2));

if (failures.length) {
  console.error('Documentation/source reconciliation gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation/source reconciliation gate PASSED: ${apiRows.length} API rows, ${dbRows.length} database rows, ${functionalRows.length} functional rows reconciled.`);
