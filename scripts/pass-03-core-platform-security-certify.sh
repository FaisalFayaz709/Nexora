#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p certification-output
{
  echo "[PASS 03] Core platform, auth, RBAC, tenant isolation and organization certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[PASS 03] Running core platform source gate"
  node scripts/check-pass-03-core-platform-security.mjs --source-only
  echo "[PASS 03] Running existing identity/organization gate"
  node scripts/check-identity-organization.mjs
  echo "[PASS 03] PASS_SOURCE_LEVEL"
  echo "[PASS 03] Strict runtime proof still requires PASS 00 lockfile/install, PostgreSQL DATABASE_URL, seed data, typecheck and executable API/integration tests."
} | tee certification-output/PASS_03_CORE_PLATFORM_SECURITY_LOG.txt
