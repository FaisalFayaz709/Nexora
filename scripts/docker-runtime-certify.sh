#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/certification-output/docker-runtime"
mkdir -p "$OUT"
LOG="$OUT/docker-runtime-certification.log"
: > "$LOG"

run() {
  echo "" | tee -a "$LOG"
  echo "\$ $*" | tee -a "$LOG"
  "$@" 2>&1 | tee -a "$LOG"
}

capture_on_failure() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    echo "" | tee -a "$LOG"
    echo "R3 runtime certification FAILED. Capturing Docker state..." | tee -a "$LOG"
    docker compose ps 2>&1 | tee "$OUT/docker-compose-ps.failure.txt" | tee -a "$LOG" || true
    docker compose logs --no-color 2>&1 | tee "$OUT/docker-compose-logs.failure.txt" >/dev/null || true
  fi
  exit $status
}
trap capture_on_failure EXIT

export NEXORA_HTTP_PORT="${NEXORA_HTTP_PORT:-8080}"

echo "NEXORA Docker Runtime Certification" | tee -a "$LOG"
date -u +"UTC %Y-%m-%dT%H:%M:%SZ" | tee -a "$LOG"
echo "HTTP gateway port: ${NEXORA_HTTP_PORT}" | tee -a "$LOG"

if [[ ! -f pnpm-lock.yaml ]]; then
  echo "REQUIRED FILE MISSING: pnpm-lock.yaml" | tee -a "$LOG"
  echo "Generate pnpm-lock.yaml first: bash scripts/generate-lockfile.sh" | tee -a "$LOG"
  exit 1
fi

run node --version
run docker --version
run docker compose version
run pnpm --version
run docker compose config

docker compose config > "$OUT/docker-compose.config.yml"

run docker compose down --remove-orphans
run docker compose build
run docker compose up -d postgres redis minio
run docker compose up minio-init
run docker compose up migrator
run docker compose up -d api worker web nginx

wait_for_url() {
  local url="$1"
  local target="$2"
  local tries="${3:-60}"
  for ((i=1; i<=tries; i++)); do
    if curl -fsS "$url" > "$target"; then
      echo "Ready: $url" | tee -a "$LOG"
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for $url" | tee -a "$LOG"
  return 1
}

wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/healthz" "$OUT/nginx-healthz.txt" 60
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/api/v1/health/live" "$OUT/api-live.json" 60
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/api/v1/health/ready" "$OUT/api-ready.json" 60
wait_for_url "http://127.0.0.1:${NEXORA_HTTP_PORT}/" "$OUT/web-home.html" 60

run docker compose ps
run docker compose logs --no-color --tail=200

docker compose ps > "$OUT/docker-compose-ps.txt"
docker compose logs --no-color --tail=300 > "$OUT/docker-compose-logs.tail.txt"

echo "Docker runtime certification PASSED. Evidence saved to certification-output/docker-runtime/." | tee -a "$LOG"
trap - EXIT
