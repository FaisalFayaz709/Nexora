#!/usr/bin/env bash
set -euo pipefail
node scripts/check-pass-r9-identity-organization-rbac-frontend.mjs --source-only
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  node scripts/check-pass-r9-identity-organization-rbac-frontend.mjs
else
  echo "R9 source gate passed. Runtime certification skipped because pnpm-lock.yaml is missing; run Pass R1 locally first."
fi
