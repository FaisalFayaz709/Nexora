#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-18-frontend-completion.mjs "$@" | tee certification-output/PASS_18_FRONTEND_COMPLETION_LOG.txt
