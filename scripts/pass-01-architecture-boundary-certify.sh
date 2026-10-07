#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p certification-output
{
  echo "[PASS 01] Architecture boundary certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[PASS 01] Running locked architecture gate"
  node scripts/check-architecture.mjs
  echo "[PASS 01] Running import/boundary source audit"
  node scripts/check-pass-01-architecture-boundary-audit.mjs --source-only
  echo "[PASS 01] Running locked contract gate"
  node scripts/check-contracts.mjs
  echo "[PASS 01] PASS_SOURCE_LEVEL"
} | tee certification-output/PASS_01_ARCHITECTURE_BOUNDARY_AUDIT_LOG.txt
