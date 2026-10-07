#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if command -v npm >/dev/null 2>&1; then
  npm --version >/dev/null
fi

corepack enable
corepack prepare pnpm@10.15.0 --activate

if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ] || [ -f yarn.lock ] || [ -f bun.lockb ]; then
  echo "Forbidden non-pnpm lockfile detected. Remove package-lock.json/npm-shrinkwrap.json/yarn.lock/bun.lockb before continuing." >&2
  exit 1
fi

pnpm --version
pnpm install --lockfile-only
node scripts/check-lockfile-policy.mjs
pnpm install --frozen-lockfile
pnpm dependencies:check

echo "PASS M1 completed: real pnpm-lock.yaml exists, frozen install passed, and dependency foundation gate passed."
