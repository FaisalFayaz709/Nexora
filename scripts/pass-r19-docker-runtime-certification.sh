#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/certification-output/docker-runtime-r19"
mkdir -p "$OUT"
LOG="$OUT/r19-docker-runtime-certification.log"
: > "$LOG"

export R19_DOCKER_RUNTIME_CERTIFICATION=1
export NEXORA_HTTP_PORT="${NEXORA_HTTP_PORT:-8080}"
export NEXORA_COMPOSE_PROJECT_NAME="${NEXORA_COMPOSE_PROJECT_NAME:-nexora_r19_cert}"
export NEXORA_API_BASE_URL="${NEXORA_API_BASE_URL:-http://127.0.0.1:${NEXORA_HTTP_PORT}/api/v1}"

log() { echo "$*" | tee -a "$LOG"; }
run() {
  log ""
  log "\$ $*"
  "$@" 2>&1 | tee -a "$LOG"
}
compose() {
  docker compose --project-name "$NEXORA_COMPOSE_PROJECT_NAME" "$@"
}
write_failure_snapshot() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    log ""
    log "R19_DOCKER_RUNTIME_CERTIFICATION failed. Capturing compose state and logs."
    compose ps 2>&1 | tee "$OUT/docker-compose-ps.failure.txt" | tee -a "$LOG" >/dev/null || true
    compose logs --no-color 2>&1 | tee "$OUT/docker-compose-logs.failure.txt" >/dev/null || true
    node scripts/check-pass-r19-docker-runtime-certification.mjs --evidence 2>&1 | tee -a "$LOG" || true
  fi
  exit $status
}
trap write_failure_snapshot EXIT

wait_for_url() {
  local url="$1"
  local target="$2"
  local tries="${3:-90}"
  for ((i=1; i<=tries; i++)); do
    if curl -fsS "$url" > "$target"; then
      log "Ready: $url"
      return 0
    fi
    sleep 2
  done
  log "Timed out waiting for $url"
  return 1
}

log "R19_DOCKER_RUNTIME_CERTIFICATION"
log "UTC $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log "Compose project: $NEXORA_COMPOSE_PROJECT_NAME"
log "HTTP gateway port: $NEXORA_HTTP_PORT"
log "API base URL: $NEXORA_API_BASE_URL"

if [[ ! -f pnpm-lock.yaml ]]; then
  log "REQUIRED FILE MISSING: pnpm-lock.yaml"
  log "Generate it first on an online machine: pnpm install --lockfile-only"
  exit 1
fi

command -v node >/dev/null || { log "node is required"; exit 1; }
command -v docker >/dev/null || { log "Docker CLI is required. Docker Desktop must be running."; exit 1; }
command -v curl >/dev/null || { log "curl is required"; exit 1; }

run node --version
run corepack --version
run corepack enable
run corepack prepare pnpm@10.15.0 --activate
run pnpm --version
run docker --version
run docker compose version

run pnpm install --frozen-lockfile
run pnpm verify:static
run pnpm lint
run pnpm typecheck
run pnpm db:validate
run pnpm db:generate
run pnpm build

log ""
log "\$ docker compose --project-name $NEXORA_COMPOSE_PROJECT_NAME config"
compose config 2>&1 | tee "$OUT/docker-compose.config.yml" | tee -a "$LOG" >/dev/null

run compose down --remove-orphans
run compose build
run compose up -d postgres redis minio
run compose up minio-init
run compose up migrator
run compose up -d api worker web nginx

wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/healthz" "$OUT/nginx-healthz.txt" 90
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/api/v1/health/live" "$OUT/api-live.json" 90
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/api/v1/health/ready" "$OUT/api-ready.json" 90
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/" "$OUT/web-home.html" 90

log ""
log "\$ docker compose --project-name $NEXORA_COMPOSE_PROJECT_NAME ps"
compose ps 2>&1 | tee "$OUT/docker-compose-ps.txt" | tee -a "$LOG" >/dev/null
compose logs --no-color --tail=300 > "$OUT/docker-compose-logs.tail.txt"

log ""
log "\$ docker compose --project-name $NEXORA_COMPOSE_PROJECT_NAME run --rm minio-init R19_DOCKER_RUNTIME_MINIO_PROOF"
compose run --rm --entrypoint /bin/sh minio-init -lc "mc alias set local http://minio:9000 nexora-local change-me-local-only >/dev/null && printf 'R19_DOCKER_RUNTIME_MINIO_PROOF %s\n' \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" > /tmp/r19-minio-proof.txt && mc cp /tmp/r19-minio-proof.txt local/nexora-private/runtime-certification/r19-minio-proof.txt >/dev/null && mc cat local/nexora-private/runtime-certification/r19-minio-proof.txt" 2>&1 | tee "$OUT/minio-upload-download-proof.txt" | tee -a "$LOG" >/dev/null

if [[ "${NEXORA_R19_SKIP_FULL_WORKFLOW_E2E:-0}" != "1" ]]; then
  RUN_FULL_WORKFLOW_E2E=1 RUNTIME_CERTIFICATION=1 NEXORA_API_BASE_URL="$NEXORA_API_BASE_URL" run pnpm full-workflow:e2e:certify
fi

if [[ "${NEXORA_R19_RUN_BROWSER_E2E:-0}" == "1" ]]; then
  RUN_BROWSER_E2E=1 RUNTIME_CERTIFICATION=1 NEXORA_API_BASE_URL="$NEXORA_API_BASE_URL" run pnpm test:e2e:browser:strict
else
  log "Browser E2E skipped by default. Set NEXORA_R19_RUN_BROWSER_E2E=1 to include it."
fi

cat > "$OUT/r19-runtime-evidence-manifest.json" <<JSON
{
  "pass": "R19",
  "gate": "R19_DOCKER_RUNTIME_CERTIFICATION",
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "composeProjectName": "$NEXORA_COMPOSE_PROJECT_NAME",
  "httpGatewayPort": "$NEXORA_HTTP_PORT",
  "apiBaseUrl": "$NEXORA_API_BASE_URL",
  "evidenceDirectory": "certification-output/docker-runtime-r19",
  "evidence": [
    "r19-docker-runtime-certification.log",
    "docker-compose.config.yml",
    "docker-compose-ps.txt",
    "nginx-healthz.txt",
    "api-live.json",
    "api-ready.json",
    "web-home.html",
    "minio-upload-download-proof.txt",
    "docker-compose-logs.tail.txt"
  ],
  "runtimeStatus": "PASS_DOCKER_RUNTIME_CERTIFIED_WITH_EVIDENCE"
}
JSON

node scripts/check-pass-r19-docker-runtime-certification.mjs --evidence | tee -a "$LOG"
log "R19_DOCKER_RUNTIME_CERTIFICATION PASSED. Evidence saved to certification-output/docker-runtime-r19/."
trap - EXIT
