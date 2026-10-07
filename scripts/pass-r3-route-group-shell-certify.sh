#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-r3-route-group-shell-compliance.mjs --source-only
if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
  pnpm frontend:shells:check
  pnpm --filter @nexora/frontend typecheck
else
  echo "WARN: pnpm install/typecheck skipped because pnpm or pnpm-lock.yaml is unavailable. Generate the lockfile on a connected workstation."
fi
