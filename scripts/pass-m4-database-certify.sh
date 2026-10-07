#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-prisma-schema-migrations.mjs

if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
  pnpm db:validate
  pnpm db:generate
  if [ -n "${DATABASE_URL:-}" ]; then
    pnpm db:migrate:deploy
    pnpm db:seed
  else
    echo "DATABASE_URL is not set; skipped db:migrate:deploy and db:seed runtime execution."
  fi
else
  echo "pnpm or pnpm-lock.yaml is unavailable; static M4 gate passed, runtime Prisma CLI gates remain local."
fi
