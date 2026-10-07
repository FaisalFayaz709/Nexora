#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
node scripts/check-pass-r5-backend-offline-sync-route.mjs "$@"
if [[ -f pnpm-lock.yaml ]]; then
  pnpm contracts:check
  pnpm route-coverage:check
  pnpm field-service:check
  pnpm typecheck
  pnpm test --filter @nexora/backend
else
  echo "WARN: pnpm-lock.yaml missing; run pnpm install on a connected machine before full runtime/type/test certification." >&2
fi
