#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p certification-output
LOG="certification-output/backup-restore.log"
: > "$LOG"
log() { echo "$*" | tee -a "$LOG"; }
run() { log "\$ $*"; "$@" 2>&1 | tee -a "$LOG"; }

log "BACKUP_RESTORE_CERTIFICATION"
log "Generated UTC $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "This evidence is produced only by a live Docker Compose runtime; it is not synthetic."

run docker compose ps
run docker compose exec -T postgres pg_isready -U nexora -d nexora
run docker compose exec -T postgres sh -lc 'pg_dump -U nexora -d nexora -Fc -f /tmp/nexora_backup.dump'
run docker compose exec -T postgres sh -lc 'sha256sum /tmp/nexora_backup.dump'
run docker compose exec -T postgres sh -lc 'dropdb -U nexora --if-exists nexora_restore_verify'
run docker compose exec -T postgres sh -lc 'createdb -U nexora nexora_restore_verify'
run docker compose exec -T postgres sh -lc 'pg_restore -U nexora -d nexora_restore_verify /tmp/nexora_backup.dump'
run docker compose exec -T postgres sh -lc "psql -U nexora -d nexora_restore_verify -v ON_ERROR_STOP=1 -c \"select count(*) as restored_table_count from information_schema.tables where table_schema = 'public';\""
run docker compose exec -T postgres sh -lc 'dropdb -U nexora --if-exists nexora_restore_verify'

log "BACKUP_RESTORE_CERTIFICATION_PASSED"
log "certification-output/backup-restore.log"
