#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p certification-output
{
  echo "[PASS 02] Database, Prisma, migration and seed certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[PASS 02] Running database source gate"
  node scripts/check-pass-02-database-migration-seed-certification.mjs --source-only
  echo "[PASS 02] Running existing database foundation gate"
  node scripts/check-database-foundation.mjs
  echo "[PASS 02] Running existing database runtime-source foundation gate"
  node scripts/check-database-runtime-foundation.mjs
  echo "[PASS 02] Running Prisma schema/migration static gate"
  node scripts/check-prisma-schema-migrations.mjs
  echo "[PASS 02] PASS_SOURCE_LEVEL"
  echo "[PASS 02] Strict runtime proof still requires: pnpm install --frozen-lockfile, PostgreSQL DATABASE_URL, pnpm db:generate, pnpm db:validate, pnpm db:migrate:deploy and pnpm db:seed."
} | tee certification-output/PASS_02_DATABASE_MIGRATION_SEED_CERTIFICATION_LOG.txt
