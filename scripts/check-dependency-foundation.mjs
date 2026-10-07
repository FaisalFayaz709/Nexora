import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const requiredFiles = [
  'package.json','pnpm-workspace.yaml','tsconfig.base.json','eslint.config.mjs','.prettierrc.json','.env.example',
  'frontend/package.json','backend/package.json','worker/package.json','shared/package.json','database/package.json',
  'docker-compose.yml','.github/workflows/ci.yml','infrastructure/nginx/nginx.conf',
'docs/compliance/OFFLINE_DEPENDENCY_NOTE.md'
];
const missing = requiredFiles.filter(p => !existsSync(join(root,p)));
if (missing.length) { console.error('Missing dependency-foundation files:', missing); process.exit(1); }
const ws = readFileSync(join(root,'pnpm-workspace.yaml'),'utf8');
for (const x of ['frontend','backend','worker','shared','database']) if (!ws.includes(`- ${x}`)) { console.error(`Workspace missing ${x}`); process.exit(1); }
const arch = spawnSync(process.execPath, ['scripts/check-architecture.mjs'], {stdio:'inherit'});
if (arch.status !== 0) process.exit(arch.status ?? 1);
console.log('Dependency foundation gate PASSED. Dependency install/build verification requires registry access; see docs/compliance/OFFLINE_DEPENDENCY_NOTE.md.');
