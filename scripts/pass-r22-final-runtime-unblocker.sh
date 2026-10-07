#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/certification-output/pass-r22-final-runtime-unblocker"
LOG="$OUT/r22-final-runtime.log"
SUMMARY="$OUT/r22-step-summary.tsv"
RESULT="$OUT/r22-final-runtime-result.json"
mkdir -p "$OUT"
: > "$LOG"
printf 'step\tstatus\n' > "$SUMMARY"

log() { printf '%s\n' "$*" | tee -a "$LOG"; }
record() { printf '%s\t%s\n' "$1" "$2" >> "$SUMMARY"; }
run_step() {
  local name="$1"
  shift
  log "\n===== R22 STEP: $name ====="
  if "$@" 2>&1 | tee -a "$LOG"; then
    record "$name" "PASS"
  else
    record "$name" "FAIL"
    log "R22 failed at step: $name"
    write_result "NO_GO_RUNTIME_FAILED" "$name"
    exit 1
  fi
}
write_result() {
  local status="$1"
  local failed_step="${2:-}"
  node - <<NODE
const fs = require('fs');
const summaryPath = '$SUMMARY';
const rows = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf8').trim().split(/\n/).slice(1).map((line)=>{ const [step,status] = line.split(/\t/); return { step, status }; }) : [];
const result = {
  pass: 'R22',
  name: 'Final runtime unblocker and production certification handoff',
  status: '$status',
  failedStep: '$failed_step' || null,
  generatedAt: new Date().toISOString(),
  productionGoClaimed: '$status' === 'GO_CANDIDATE_RUNTIME_CERTIFIED',
  steps: rows
};
fs.writeFileSync('$RESULT', JSON.stringify(result, null, 2));
NODE
}

log "PASS R22 final runtime unblocker started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

run_step "source handoff gate" node scripts/check-pass-r22-final-runtime-unblocker.mjs --source-only
run_step "node version" node -e "const v=process.versions.node.split('.').map(Number); if(v[0]!==22) { console.error('Node 22.x is required. Found '+process.versions.node); process.exit(1); } console.log('Node '+process.versions.node+' OK');"
run_step "corepack enable" corepack enable
run_step "activate pnpm" corepack prepare pnpm@10.15.0 --activate
run_step "pnpm version" pnpm --version

if [ ! -f pnpm-lock.yaml ]; then
  run_step "generate pnpm lockfile" pnpm install --lockfile-only
else
  log "pnpm-lock.yaml already exists; skipping lockfile generation."
  record "generate pnpm lockfile" "SKIPPED_ALREADY_EXISTS"
fi

run_step "frozen install" pnpm install --frozen-lockfile
run_step "R21 source audit" pnpm pass:r21:source-check
run_step "static verification" pnpm verify:static
run_step "format check" pnpm format:check
run_step "lint" pnpm lint
run_step "typecheck" pnpm typecheck
run_step "unit and integration tests" pnpm test
run_step "Prisma validation" pnpm db:validate
run_step "build" pnpm build
run_step "Docker compose config" docker compose config
run_step "Docker compose build" docker compose build
run_step "Docker compose up" docker compose up -d

log "Waiting for runtime services to settle..."
sleep 20
run_step "Docker compose ps" docker compose ps
run_step "Nginx health" curl -fsS http://localhost:8080/healthz
run_step "API live health" curl -fsS http://localhost:8080/api/v1/health/live
run_step "API readiness health" curl -fsS http://localhost:8080/api/v1/health/ready
run_step "Prisma generate" pnpm db:generate
run_step "Migration deploy" pnpm db:migrate:deploy
run_step "Migration status" pnpm db:migrate:status
run_step "Seed" pnpm db:seed
run_step "Strict browser E2E" pnpm test:e2e:browser:strict
run_step "Security smoke" pnpm security:smoke:preflight
run_step "Full workflow E2E certification" pnpm full-workflow:e2e:certify
run_step "Production release certification" pnpm production-release:certify
run_step "R22 final source/runtime evidence recheck" node scripts/check-pass-r22-final-runtime-unblocker.mjs

write_result "GO_CANDIDATE_RUNTIME_CERTIFIED" ""
log "R22 completed successfully. Current decision: GO_CANDIDATE_RUNTIME_CERTIFIED. Review evidence before production approval."
