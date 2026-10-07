#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf',
  'docs/source/README.md',
  'docs/SOURCE_OF_TRUTH.md',
  'docs/compliance/BLUEPRINT_SOURCE_OF_TRUTH.md',
  'docs/compliance/APPENDIX_G_FRONTEND_COMPLETION_LOCK.md',
  'docs/traceability/source-gap-register.md',
  'package.json'
];

const containsChecks = [
  {
    file: 'docs/SOURCE_OF_TRUTH.md',
    mustContain: [
      'Total pages: **90**',
      'Appendix F',
      'Appendix G',
      'Version 1.2',
      'NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf',
      'POST /api/v1/portal/technician/offline-sync',
      'shadcn/ui',
      'React Hook Form',
      'TanStack Table'
    ],
    mustNotContain: ['Total pages: **82**']
  },
  {
    file: 'docs/compliance/BLUEPRINT_SOURCE_OF_TRUTH.md',
    mustContain: [
      'Total pages: **90**',
      'Appendix F',
      'Appendix G',
      'Frontend Implementation Completion Addendum v1.2',
      'Fastify + TypeScript',
      'PostgreSQL',
      'Prisma',
      'MinIO',
      'Redis + BullMQ',
      'React Hook Form',
      'TanStack Table',
      'shadcn/ui'
    ],
    mustNotContain: ['Total pages: **82**']
  },
  {
    file: 'docs/compliance/APPENDIX_G_FRONTEND_COMPLETION_LOCK.md',
    mustContain: [
      'shadcn/ui',
      'React Hook Form',
      'Zod',
      'TanStack Table',
      'TanStack Query',
      '(erp)/layout.tsx',
      '(portal)/layout.tsx',
      '(technician)/layout.tsx',
      'POST /api/v1/portal/technician/offline-sync',
      'Next.js route handlers cannot own business logic'
    ]
  },
  {
    mustContain: Array.from({ length: 22 }, (_, index) => `R${index}`).concat([
      'R0 — Source-of-truth rebase',
      'R1 — Dependency and lockfile repair',
      'R21 — Final blueprint compliance audit'
    ])
  },
  {
    file: 'docs/traceability/source-gap-register.md',
    mustContain: ['GAP-FE-APPENDIX-G-001', 'GAP-RUNTIME-R0-001']
  },
  {
    mustContain: ['R0 Appendix G Rebase Notice']
  },
  {
    mustContain: ['R0 Appendix G Rebase Notice']
  },
  {
    file: 'package.json',
    mustContain: ['"pass:r0:certify"']
  }
];

const failures = [];
const checked = [];

for (const file of requiredFiles) {
  const ok = existsSync(resolve(root, file));
  checked.push({ file, check: 'exists', ok });
  if (!ok) failures.push(`${file} is missing`);
}

for (const check of containsChecks) {
  if (!check.file) continue;
  const filePath = resolve(root, check.file);
  if (!existsSync(filePath)) continue;
  const text = readFileSync(filePath, 'utf8');
  for (const needle of check.mustContain ?? []) {
    const ok = text.includes(needle);
    checked.push({ file: check.file, check: `contains ${needle}`, ok });
    if (!ok) failures.push(`${check.file} does not contain required text: ${needle}`);
  }
  for (const needle of check.mustNotContain ?? []) {
    const ok = !text.includes(needle);
    checked.push({ file: check.file, check: `does not contain ${needle}`, ok });
    if (!ok) failures.push(`${check.file} still contains forbidden old baseline text: ${needle}`);
  }
}

const pdfPath = resolve(root, 'docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf');
let pdfSha256 = null;
if (existsSync(pdfPath)) {
  pdfSha256 = createHash('sha256').update(readFileSync(pdfPath)).digest('hex');
}

const output = {
  pass: 'R0',
  name: 'Source-of-truth rebase to latest 90-page blueprint',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  scope: 'source authority and documentation alignment only',
  checkedAt: new Date().toISOString(),
  root: relative(process.cwd(), root) || '.',
  pdf: {
    path: 'docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf',
    sha256: pdfSha256
  },
  checked,
  failures,
  remainingBlockers: [
    'pnpm-lock.yaml still missing; R1 must generate and certify it.',
    'Appendix G frontend packages and components are not implemented until R2.',
    'Route-group shell enforcement is not implemented until R3.',
    'Fastify POST /api/v1/portal/technician/offline-sync is not implemented until R5.',
    'Runtime, E2E, Docker and production evidence remain blocked until later remediation passes.'
  ]
};

mkdirSync(resolve(root, 'certification-output'), { recursive: true });
writeFileSync(
  resolve(root, 'certification-output/pass-r0-source-of-truth-rebase.json'),
  `${JSON.stringify(output, null, 2)}\n`
);

if (failures.length > 0) {
  console.error('PASS R0 source-of-truth rebase FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS R0 source-of-truth rebase PASSED');
console.log(`Latest blueprint PDF SHA-256: ${pdfSha256}`);
