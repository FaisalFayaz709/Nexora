import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function writeText(path, value) {
  const full = join(root, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, value);
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
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])));
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(path, headers, rows) {
  const output = [headers.join(',')]
    .concat(rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')))
    .join('\n') + '\n';
  writeText(path, output);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function routeInventory() {
  const pattern = /defineLockedRoute\(\s*['"]([A-Z]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  const routes = [];
  const moduleRoot = join(root, 'backend/src/modules');
  if (!existsSync(moduleRoot)) return routes;
  for (const file of walk(moduleRoot).filter((candidate) => candidate.endsWith('.routes.ts'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      routes.push({ method: match[1], endpoint: match[2], file: relative(root, file) });
    }
  }
  return routes;
}

function prismaModels() {
  const schemaPath = join(root, 'database/prisma/schema.prisma');
  if (!existsSync(schemaPath)) return new Set();
  const text = readFileSync(schemaPath, 'utf8');
  return new Set([...text.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{/gm)].map((match) => match[1]));
}

function moduleFolders() {
  const moduleRoot = join(root, 'backend/src/modules');
  if (!existsSync(moduleRoot)) return new Set();
  return new Set(readdirSync(moduleRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name));
}

function apiMatrix(routes) {
  const rows = parseCsv(readText('docs/contracts/api-endpoint-matrix.csv'));
  const routeSet = new Set(routes.map((route) => `${route.method} ${route.endpoint}`));
  for (const row of rows) {
    row.status = routeSet.has(`${row.method} ${row.endpoint}`) ? 'IMPLEMENTED_STATIC_ONLY' : 'NOT_IMPLEMENTED';
  }
  writeCsv('docs/contracts/api-endpoint-matrix.csv', ['area', 'method', 'endpoint', 'purpose', 'permission', 'notes', 'source', 'status'], rows);

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.area)) grouped.set(row.area, []);
    grouped.get(row.area).push(row);
  }
  const lines = [
    '# NEXORA ERP — Locked API Endpoint Matrix',
    '',
    `**Total catalogued endpoints:** ${rows.length}`,
    '',
    '> Status is reconciled from actual `defineLockedRoute(method, path)` signatures in `backend/src/modules/**/*.routes.ts`.',
    '>',
    '> `IMPLEMENTED_STATIC_ONLY` means the locked method/path signature is present in source. It does not mean the endpoint has passed runtime, database, authorization or E2E certification.',
    '',
  ];
  for (const [area, entries] of grouped) {
    lines.push(`## ${area}`, '', '| Method | Endpoint | Purpose | Permission | Notes | Source | Status |', '|---|---|---|---|---|---|---|');
    for (const row of entries) {
      lines.push(`| ${row.method} | \`${row.endpoint}\` | ${row.purpose} | ${row.permission ? `\`${row.permission}\`` : ''} | ${row.notes} | ${row.source} | ${row.status} |`);
    }
    lines.push('');
  }
  writeText('docs/contracts/api-endpoint-matrix.md', lines.join('\n'));
  return rows;
}

function databaseMatrix(models) {
  const rows = parseCsv(readText('docs/traceability/database-entity-matrix.csv'));
  for (const row of rows) {
    row.implementation_state = models.has(row.entity) ? 'IMPLEMENTED_STATIC_ONLY' : 'NOT_IMPLEMENTED';
  }
  writeCsv('docs/traceability/database-entity-matrix.csv', ['domain', 'entity', 'key_fields_or_relationship_note', 'purpose', 'source', 'implementation_state'], rows);

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.domain)) grouped.set(row.domain, []);
    grouped.get(row.domain).push(row);
  }
  const lines = [
    '# NEXORA ERP — Database Entity Matrix',
    '',
    `**Captured entity entries:** ${rows.length}`,
    '',
    '> Status is reconciled from actual Prisma model declarations in `database/prisma/schema.prisma`.',
    '>',
    '> `IMPLEMENTED_STATIC_ONLY` means the logical entity has a corresponding Prisma model. It does not certify migrations, seed data, indexes, runtime queries or transaction behavior.',
    '',
  ];
  for (const [domain, entries] of grouped) {
    lines.push(`## ${domain}`, '', '| Entity | Key fields / scope note | Purpose | Source | State |', '|---|---|---|---|---|');
    for (const row of entries) {
      lines.push(`| \`${row.entity}\` | ${row.key_fields_or_relationship_note} | ${row.purpose} | ${row.source} | ${row.implementation_state} |`);
    }
    lines.push('');
  }
  writeText('docs/traceability/database-entity-matrix.md', lines.join('\n'));
  return rows;
}

const sourceReferenceOnly = new Set([
  'Project Overview',
  'Target Organizations',
  'Core Business Scenario',
  'Recommended Development Phases',
  'Final Navigation Structure',
  'What Makes NEXORA Different',
  'Professional Portfolio Description',
  'Recommended Core Scope',
  'Final Vision',
]);

const directEvidence = new Map([
  ['System Architecture Concept', ['backend', 'frontend', 'shared', 'database', 'worker']],
  ['Multi-Company and Multi-Branch Architecture', ['organization', 'identity']],
  ['Organization Management Module', ['organization']],
  ['Identity and Access Management', ['identity']],
  ['Role-Based Access Control', ['identity']],
  ['Employee and HR Management', ['hr']],
  ['Attendance Management', ['hr']],
  ['Leave Management', ['hr']],
  ['Payroll', ['hr']],
  ['Customer Management', ['customers']],
  ['Sales and Opportunity Management', ['crm']],
  ['Site Survey Module', ['crm']],
  ['Quotation Management', ['crm']],
  ['Contract Management', ['crm']],
  ['Project Management', ['projects']],
  ['Project Task Management', ['projects']],
  ['Project Milestones', ['projects']],
  ['Bill of Materials', ['projects']],
  ['Procurement Management', ['procurement']],
  ['Purchase Request', ['procurement']],
  ['RFQ Management', ['procurement']],
  ['Supplier Quotation Comparison', ['procurement']],
  ['Vendor Management', ['vendors']],
  ['Purchase Orders', ['procurement']],
  ['Goods Receiving', ['procurement']],
  ['Inventory Management', ['inventory']],
  ['Multiple Warehouses', ['inventory']],
  ['Stock Transactions', ['inventory']],
  ['Serial Number Tracking', ['inventory']],
  ['Batch and Lot Tracking', ['inventory']],
  ['Stock Reservation', ['inventory']],
  ['Reorder Levels', ['inventory']],
  ['Asset Management', ['assets']],
  ['Asset Lifecycle', ['assets']],
  ['QR Asset Tracking', ['assets']],
  ['Customer Site Management', ['customers']],
  ['Preventive Maintenance', ['maintenance']],
  ['Corrective Maintenance', ['maintenance', 'service']],
  ['Helpdesk and Ticketing', ['service']],
  ['SLA Management', ['service']],
  ['Work Order Management', ['service']],
  ['Technician Management', ['service']],
  ['Technician Spare-Part Inventory', ['service', 'inventory']],
  ['Field Service Report', ['service']],
  ['Warranty Management', ['assets', 'maintenance']],
  ['RMA / Equipment Return Management', ['assets']],
  ['Financial Management', ['finance']],
  ['Customer Invoice', ['finance']],
  ['Supplier Invoice', ['finance']],
  ['Expense Management', ['finance']],
  ['Project Costing', ['projects', 'finance']],
  ['Budget Management', ['projects']],
  ['Approval Engine', ['approvals']],
  ['Workflow Engine', ['approvals']],
  ['Document Management', ['documents']],
  ['Document Expiry Management', ['documents']],
  ['Customer Portal', ['crm-portals']],
  ['Vendor Portal', ['crm-portals']],
  ['Notification Centre', ['notifications']],
  ['Audit Trail', ['audit', 'identity']],
  ['Maker-Checker Control', ['approvals']],
  ['Fraud and Control Rules', ['approvals', 'commercial-finance']],
  ['Dashboard System', ['reports']],
  ['Reporting System', ['reports']],
  ['Global Search', ['reports']],
  ['Activity Timeline', ['reports']],
  ['Comments and Internal Notes', ['communications']],
  ['Internal Task Management', ['enterprise-controls-platform']],
  ['Calendar', ['reports']],
  ['Business Rules Engine', ['enterprise-controls-platform']],
  ['Scheduled Jobs', ['worker']],
  ['Recurring Contracts and Billing', ['commercial-finance', 'saas']],
  ['Subscription / Service Package Management', ['saas']],
  ['Asset Depreciation', ['commercial-finance', 'assets']],
  ['Fixed Asset Management', ['assets']],
  ['Fleet Management', ['advanced-ops']],
  ['Tool Management', ['advanced-ops']],
  ['Safety and Incident Management', ['advanced-ops']],
  ['Quality Inspection', ['procurement', 'advanced-ops']],
  ['Customer Handover', ['projects']],
  ['Knowledge Base', ['enterprise-controls-platform']],
  ['Custom Fields', ['enterprise-controls-platform']],
  ['Custom Statuses', ['enterprise-controls-platform']],
  ['Localization', ['enterprise-controls-platform']],
  ['Data Import and Export', ['data-import']],
  ['Backup and Restore', ['production']],
  ['System Health Dashboard', ['reports']],
  ['API Integration Layer', ['backend']],
  ['Webhook System', ['enterprise-controls-platform']],
  ['Mobile / PWA Application', ['crm-portals']],
  ['Offline Field Mode', ['crm-portals']],
  ['Security Features', ['identity']],
  ['Data Isolation', ['identity']],
  ['Number Sequence Management', ['number-sequence-business-masters']],
  ['Vendor Onboarding & Vendor Risk', ['procurement-commercial-extensions']],
  ['Physical Stock Count / Cycle Count', ['commercial-procurement', 'inventory']],
  ['Landed Cost & Inventory Valuation', ['commercial-finance']],
  ['Tax Engine', ['commercial-finance']],
  ['Bank & Cash Management', ['commercial-finance']],
  ['Purchase Contracts / Blanket Purchase Orders', ['procurement-commercial-extensions']],
  ['Data Import Wizard & Data Quality', ['data-import']],
  ['Communication Log', ['communications']],
  ['Technician GPS & Visit Verification', ['crm-portals', 'service']],
  ['Custom Report Builder', ['reports']],
  ['Feature Flags & Module Configuration', ['enterprise-controls-platform', 'saas']],
  ['SaaS Subscription & Tenant Billing', ['saas']],
]);

function hasEvidence(token, folders) {
  if (folders.has(token)) return true;
  return existsSync(join(root, token)) || existsSync(join(root, `docs/architecture/source-boundaries/${token}.md`));
}

function functionalMatrix(folders) {
  const rows = parseCsv(readText('docs/traceability/functional-scope-matrix.csv'));
  for (const row of rows) {
    if (sourceReferenceOnly.has(row.requirement)) {
      row.implementation_state = 'SOURCE_REFERENCE_ONLY';
      continue;
    }
    const evidence = directEvidence.get(row.requirement) ?? [];
    const found = evidence.some((token) => hasEvidence(token, folders));
    row.implementation_state = found ? 'IMPLEMENTED_STATIC_ONLY' : 'PARTIAL';
  }
  writeCsv('docs/traceability/functional-scope-matrix.csv', ['requirement_id', 'source', 'requirement', 'lock_type', 'implementation_state'], rows);

  const lines = [
    '# NEXORA ERP — Functional Scope Matrix',
    '',
    `**Captured functional entries:** ${rows.length}`,
    '',
    '> Status is source-reconciled from module folders, route/model evidence, and locked architecture documentation.',
    '>',
    '> `IMPLEMENTED_STATIC_ONLY` means source artifacts exist for the capability. Runtime and E2E certification remain separate passes. `SOURCE_REFERENCE_ONLY` is used for narrative/positioning sections that are not directly executable features.',
    '',
    '| ID | Source | Requirement | Lock type | State |',
    '|---|---|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(`| ${row.requirement_id} | ${row.source} | ${row.requirement} | ${row.lock_type} | ${row.implementation_state} |`);
  }
  lines.push('');
  writeText('docs/traceability/functional-scope.md', lines.join('\n'));
  return rows;
}

const routes = routeInventory();
const models = prismaModels();
const folders = moduleFolders();
const apiRows = apiMatrix(routes);
const dbRows = databaseMatrix(models);
const functionalRows = functionalMatrix(folders);

const summaries = {
  generatedAt: '2026-09-07T00:00:00+05:00',
  basis: {
    routes: 'backend/src/modules/**/*.routes.ts defineLockedRoute signatures',
    prismaModels: 'database/prisma/schema.prisma model declarations',
    functionalEvidence: 'module folders plus locked source-boundary documentation',
  },
  api: Object.fromEntries([...new Set(apiRows.map((row) => row.status))].sort().map((state) => [state, apiRows.filter((row) => row.status === state).length])),
  database: Object.fromEntries([...new Set(dbRows.map((row) => row.implementation_state))].sort().map((state) => [state, dbRows.filter((row) => row.implementation_state === state).length])),
  functional: Object.fromEntries([...new Set(functionalRows.map((row) => row.implementation_state))].sort().map((state) => [state, functionalRows.filter((row) => row.implementation_state === state).length])),
  notImplementedDatabaseEntities: dbRows.filter((row) => row.implementation_state === 'NOT_IMPLEMENTED').map((row) => ({ domain: row.domain, entity: row.entity })),
  routeCount: routes.length,
  prismaModelCount: models.size,
};

mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/docs-source-reconciliation.json'), JSON.stringify(summaries, null, 2));

const report = [
  '# PASS M3 — Documentation and Traceability Reconciliation',
  '',
  '## Result',
  '',
  '- API endpoint matrix statuses now come from actual backend route signatures.',
  '- Database entity matrix statuses now come from actual Prisma model declarations.',
  '- Functional scope statuses now distinguish source-reference sections from static source evidence.',
  '- Runtime certification is intentionally not claimed in this pass.',
  '',
  '## Status definitions',
  '',
  '- `IMPLEMENTED_STATIC_ONLY`: source-level implementation evidence exists, but runtime/type/test/E2E certification is still pending.',
  '- `NOT_IMPLEMENTED`: locked entity/route is still missing from source evidence.',
  '- `PARTIAL`: some source evidence exists or the requirement is too broad for a single static artifact, but completion needs later passes.',
  '- `SOURCE_REFERENCE_ONLY`: blueprint narrative, positioning, roadmap or vision item; preserved for traceability but not directly executable.',
  '',
  '## Counts',
  '',
  `- Locked API endpoints: ${apiRows.length}`,
  `- Backend locked route signatures found: ${routes.length}`,
  `- API rows marked IMPLEMENTED_STATIC_ONLY: ${apiRows.filter((row) => row.status === 'IMPLEMENTED_STATIC_ONLY').length}`,
  `- Database matrix entities: ${dbRows.length}`,
  `- Prisma models found: ${models.size}`,
  `- Database rows marked IMPLEMENTED_STATIC_ONLY: ${dbRows.filter((row) => row.implementation_state === 'IMPLEMENTED_STATIC_ONLY').length}`,
  `- Database rows marked NOT_IMPLEMENTED: ${dbRows.filter((row) => row.implementation_state === 'NOT_IMPLEMENTED').length}`,
  `- Functional rows marked IMPLEMENTED_STATIC_ONLY: ${functionalRows.filter((row) => row.implementation_state === 'IMPLEMENTED_STATIC_ONLY').length}`,
  `- Functional rows marked SOURCE_REFERENCE_ONLY: ${functionalRows.filter((row) => row.implementation_state === 'SOURCE_REFERENCE_ONLY').length}`,
  '',
  '## Important limitation',
  '',
  'This pass reconciles documentation against source artifacts only. It does not certify `pnpm install --frozen-lockfile`, lint, typecheck, database migration, Docker runtime, E2E workflows or production readiness.',
  '',
];
if (summaries.notImplementedDatabaseEntities.length) {
  report.push('## Remaining database matrix gaps', '');
  for (const item of summaries.notImplementedDatabaseEntities) report.push(`- ${item.domain}: \`${item.entity}\``);
  report.push('');
}

console.log('Documentation/source reconciliation completed.');
console.log(JSON.stringify(summaries, null, 2));
