#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
echo "pnpm-lock.yaml generated. Run pnpm dependencies:check and pnpm verify:static next."
