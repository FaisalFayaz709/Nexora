#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-production-release.mjs
node scripts/check-docker-runtime-topology.mjs
node scripts/check-pass-m18-full-lifecycle-e2e-certification.mjs
node scripts/check-pass-m19-production-go-nogo-certification.mjs
