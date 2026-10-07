#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export RUN_PRODUCTION_RELEASE=1
node scripts/production-release-certify.mjs
