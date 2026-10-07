#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node scripts/check-final-runtime-core-controls.mjs
node scripts/check-runtime-readiness.mjs
