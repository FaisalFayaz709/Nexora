#!/usr/bin/env bash
set -euo pipefail
node scripts/check-pass-r8-rhf-zod-forms.mjs --source-only
if [ -f pnpm-lock.yaml ]; then
  pnpm frontend:forms:check
  pnpm typecheck
  pnpm lint
else
  echo "pnpm-lock.yaml is missing; source-only R8 gate passed, runtime certification remains pending after R1 local lockfile generation."
fi
