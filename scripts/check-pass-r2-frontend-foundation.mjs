import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();

function file(path) {
  return join(root, path);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(file(path), 'utf8'));
}

function read(path) {
  return readFileSync(file(path), 'utf8');
}

function requireFile(path) {
  if (!existsSync(file(path))) fail(`Missing required R2 file: ${path}`);
}

function requireDir(path) {
  const absolute = file(path);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) fail(`Missing required R2 directory: ${path}`);
}

function requireText(path, marker, description = marker) {
  if (!existsSync(file(path))) {
    fail(`Cannot inspect missing file ${path} for ${description}`);
    return;
  }
  const text = read(path);
  if (!text.includes(marker)) fail(`${path} missing ${description}`);
}

function listFiles(dir, predicate = () => true) {
  const base = file(dir);
  if (!existsSync(base)) return [];
  const results = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const absolute = join(current, entry);
      const stats = statSync(absolute);
      if (stats.isDirectory()) stack.push(absolute);
      else if (predicate(absolute)) results.push(absolute);
    }
  }
  return results;
}

const requiredDirs = [
  'frontend/src/components/ui',
  'frontend/src/components/app',
  'frontend/src/components/data',
  'frontend/src/components/forms',
  'frontend/src/components/feedback',
  'frontend/src/components/workflow',
  'frontend/src/lib',
];
requiredDirs.forEach(requireDir);

const requiredFiles = [
  'components.json',
  'frontend/src/lib/utils.ts',
  'frontend/src/lib/query-client.ts',
  'frontend/src/components/ui/button.tsx',
  'frontend/src/components/ui/input.tsx',
  'frontend/src/components/ui/textarea.tsx',
  'frontend/src/components/ui/label.tsx',
  'frontend/src/components/ui/select.tsx',
  'frontend/src/components/ui/checkbox.tsx',
  'frontend/src/components/ui/card.tsx',
  'frontend/src/components/ui/badge.tsx',
  'frontend/src/components/ui/table.tsx',
  'frontend/src/components/ui/dialog.tsx',
  'frontend/src/components/ui/skeleton.tsx',
  'frontend/src/components/ui/tabs.tsx',
  'frontend/src/components/ui/index.ts',
  'frontend/src/components/app/app-shell.tsx',
  'frontend/src/components/app/page-header.tsx',
  'frontend/src/components/app/guards.tsx',
  'frontend/src/components/app/shells.tsx',
  'frontend/src/components/app/index.ts',
  'frontend/src/components/data/data-table.tsx',
  'frontend/src/components/data/data-toolbar.tsx',
  'frontend/src/components/data/column-visibility-menu.tsx',
  'frontend/src/components/data/index.ts',
  'frontend/src/components/forms/form-shell.tsx',
  'frontend/src/components/forms/form-section.tsx',
  'frontend/src/components/forms/form-field-wrapper.tsx',
  'frontend/src/components/forms/controlled-fields.tsx',
  'frontend/src/components/forms/domain-fields.tsx',
  'frontend/src/components/forms/form-pattern.example.tsx',
  'frontend/src/components/forms/index.ts',
  'frontend/src/components/feedback/loading-state.tsx',
  'frontend/src/components/feedback/empty-state.tsx',
  'frontend/src/components/feedback/error-state.tsx',
  'frontend/src/components/feedback/forbidden-state.tsx',
  'frontend/src/components/feedback/index.ts',
  'frontend/src/components/workflow/status-badge.tsx',
  'frontend/src/components/workflow/timeline.tsx',
  'frontend/src/components/workflow/state-transition-panel.tsx',
  'frontend/src/components/workflow/index.ts',
];
requiredFiles.forEach(requireFile);

const frontendPackage = existsSync(file('frontend/package.json')) ? readJson('frontend/package.json') : { dependencies: {} };
const deps = frontendPackage.dependencies ?? {};
const requiredDependencies = [
  '@tanstack/react-query',
  '@tanstack/react-table',
  'react-hook-form',
  '@hookform/resolvers',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  '@radix-ui/react-slot',
];
for (const dependency of requiredDependencies) {
  if (!deps[dependency]) fail(`frontend/package.json missing dependency ${dependency}`);
}

requireText('components.json', 'ui.shadcn.com/schema.json', 'shadcn/ui schema marker');
requireText('components.json', 'frontend/src/components/ui', 'shadcn ui alias');
requireText('frontend/src/lib/utils.ts', 'twMerge(clsx(inputs))', 'shadcn-compatible cn helper');
requireText('frontend/src/components/ui/button.tsx', 'buttonVariants', 'Button variant system');
requireText('frontend/src/components/ui/button.tsx', '@radix-ui/react-slot', 'shadcn asChild Slot support');
requireText('frontend/src/components/data/data-table.tsx', '@tanstack/react-table', 'TanStack Table import');
requireText('frontend/src/components/data/data-table.tsx', 'useReactTable', 'TanStack useReactTable usage');
requireText('frontend/src/components/data/data-table.tsx', 'manualPagination', 'server pagination foundation');
requireText('frontend/src/components/data/data-table.tsx', 'manualSorting', 'allowlisted backend sorting foundation');
requireText('frontend/src/components/forms/form-shell.tsx', 'FormProvider', 'React Hook Form provider');
requireText('frontend/src/components/forms/form-shell.tsx', 'handleSubmit', 'typed RHF submit handler');
requireText('frontend/src/components/forms/controlled-fields.tsx', 'Controller', 'controlled component RHF integration');
requireText('frontend/src/components/forms/form-pattern.example.tsx', 'zodResolver', 'Zod resolver frontend form pattern');
requireText('frontend/src/components/forms/form-pattern.example.tsx', 'useMutation', 'TanStack Query mutation form pattern');
requireText('frontend/src/lib/query-client.ts', 'new QueryClient', 'centralized QueryClient construction');
requireText('frontend/src/app/providers.tsx', 'createNexoraQueryClient', 'Providers uses centralized QueryClient');
requireText('frontend/tailwind.config.ts', 'hsl(var(--primary))', 'Tailwind token mapping');
requireText('frontend/src/app/globals.css', '--primary', 'Tailwind CSS variable tokens');
requireText('frontend/src/components/workflow/state-transition-panel.tsx', 'MakerCheckerNotice', 'maker-checker workflow notice');
requireText('frontend/src/components/feedback/error-state.tsx', 'ValidationSummary', 'validation state component');
requireText('package.json', 'frontend:foundation:check', 'R2 npm script');
requireText('.github/workflows/ci.yml', 'R2 frontend-foundation source gate', 'R2 CI source gate');

const uiIndex = existsSync(file('frontend/src/components/ui/index.ts')) ? read('frontend/src/components/ui/index.ts') : '';
for (const exportName of ['button', 'input', 'select', 'table', 'dialog', 'skeleton']) {
  if (!uiIndex.includes(`./${exportName}`)) fail(`frontend/src/components/ui/index.ts does not export ${exportName}`);
}

const forbiddenFrontendImports = [
  '@nexora/database',
  '@prisma/client',
  'minio',
  'bullmq',
  'ioredis',
  '../backend',
  '../../backend',
  '../../../backend',
  '../database',
  '../../database',
  '../../../database',
];
const frontendCodeFiles = listFiles('frontend/src', (absolute) => /\.(tsx?|jsx?)$/.test(absolute));
for (const absolute of frontendCodeFiles) {
  const text = readFileSync(absolute, 'utf8');
  const importLines = text.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));
  for (const line of importLines) {
    for (const forbidden of forbiddenFrontendImports) {
      if (line.includes(forbidden)) fail(`${relative(root, absolute)} contains forbidden frontend import: ${line.trim()}`);
    }
  }
}


if (sourceOnly) warn('Source-only mode: dependency resolution, pnpm-lock regeneration, Next.js build and browser E2E were not executed.');
if (!existsSync(file('pnpm-lock.yaml'))) warn('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected machine.');

mkdirSync(file('certification-output'), { recursive: true });
const payload = {
  gate: 'pass-r2-frontend-foundation',
  pass: 'R2',
  title: 'Frontend foundation stack source gate',
  startedAt,
  completedAt: new Date().toISOString(),
  sourceOnly,
  lockedStackPreserved: true,
  scope: 'Adds Appendix G frontend foundation primitives/wrappers for shadcn/ui, React Hook Form, Zod resolver, TanStack Table and TanStack Query without claiming module CRUD completion.',
  requiredDependencies,
  requiredDirectories: requiredDirs,
  requiredFileCount: requiredFiles.length,
  frontendCodeFilesScanned: frontendCodeFiles.length,
  warnings,
  failures,
};
writeFileSync(file('certification-output/pass-r2-frontend-foundation-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Pass R2 frontend foundation gate FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Pass R2 frontend foundation gate PASSED: ${requiredFiles.length} required files, ${requiredDependencies.length} frontend dependencies and ${frontendCodeFiles.length} frontend files scanned.`);
for (const item of warnings) console.warn(`WARN: ${item}`);
