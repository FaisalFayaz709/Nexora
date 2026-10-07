$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
$Log = "certification-output/PASS_02_DATABASE_MIGRATION_SEED_CERTIFICATION_LOG.txt"
"[PASS 02] Database, Prisma, migration and seed certification started at $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))" | Tee-Object -FilePath $Log
"[PASS 02] Running database source gate" | Tee-Object -FilePath $Log -Append
node scripts/check-pass-02-database-migration-seed-certification.mjs --source-only 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 02] Running existing database foundation gate" | Tee-Object -FilePath $Log -Append
node scripts/check-database-foundation.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 02] Running existing database runtime-source foundation gate" | Tee-Object -FilePath $Log -Append
node scripts/check-database-runtime-foundation.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 02] Running Prisma schema/migration static gate" | Tee-Object -FilePath $Log -Append
node scripts/check-prisma-schema-migrations.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 02] PASS_SOURCE_LEVEL" | Tee-Object -FilePath $Log -Append
"[PASS 02] Strict runtime proof still requires: pnpm install --frozen-lockfile, PostgreSQL DATABASE_URL, pnpm db:generate, pnpm db:validate, pnpm db:migrate:deploy and pnpm db:seed." | Tee-Object -FilePath $Log -Append
