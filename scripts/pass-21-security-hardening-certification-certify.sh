#!/usr/bin/env bash
set -euo pipefail

echo "PASS 21 — Security Hardening Certification"
node scripts/check-pass-21-security-hardening-certification.mjs --source-only

echo "\nStrict local runtime commands required before GO:"
echo "pnpm install --frozen-lockfile"
echo "pnpm security:check"
echo "pnpm security:smoke:preflight"
echo "pnpm typecheck"
echo "pnpm test"
echo "pnpm build"
echo "SECURITY_SMOKE=1 node scripts/security-smoke-certify.mjs"
