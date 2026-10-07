#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
EVIDENCE_DIR="certification-output/pass-24-operations-observability-backup-dr"
mkdir -p "$EVIDENCE_DIR"
if [ ! -f pnpm-lock.yaml ]; then
  echo "PASS 24 HOLD: pnpm-lock.yaml is missing. Generate it with pnpm install --lockfile-only before runtime certification." >&2
  exit 2
fi
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm pass:24:check
pnpm verify:static
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
pnpm db:migrate:status || true
cat > "$EVIDENCE_DIR/pass-24-runtime-evidence-manifest.json" <<'JSON'
{
  "pass": "PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR",
  "status": "HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED",
  "note": "Populate this manifest with performance, backup/restore, observability, queue, incident, DR and rollback evidence before claiming GO."
}
JSON
echo "PASS 24 source/runtime preflight complete. Final GO still requires populated runtime evidence artifacts in $EVIDENCE_DIR."
