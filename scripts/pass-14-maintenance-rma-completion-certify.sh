#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-14-maintenance-rma-completion.mjs "$@"
