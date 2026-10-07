$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
$Log = "certification-output\backup-restore.log"
Set-Content -Path $Log -Value ""
function Add-Log { param([string]$Message) $Message | Tee-Object -FilePath $Log -Append }
function Invoke-Step {
  param([Parameter(Mandatory=$true)][string]$Command,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
  Add-Log "`$ $Command $($Arguments -join ' ')"
  & $Command @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $Command $($Arguments -join ' ')" }
}

Add-Log "BACKUP_RESTORE_CERTIFICATION"
Add-Log ("Generated UTC " + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))
Add-Log "This evidence is produced only by a live Docker Compose runtime; it is not synthetic."

Invoke-Step docker compose ps
Invoke-Step docker compose exec -T postgres pg_isready -U nexora -d nexora
Invoke-Step docker compose exec -T postgres sh -lc "pg_dump -U nexora -d nexora -Fc -f /tmp/nexora_backup.dump"
Invoke-Step docker compose exec -T postgres sh -lc "sha256sum /tmp/nexora_backup.dump"
Invoke-Step docker compose exec -T postgres sh -lc "dropdb -U nexora --if-exists nexora_restore_verify"
Invoke-Step docker compose exec -T postgres sh -lc "createdb -U nexora nexora_restore_verify"
Invoke-Step docker compose exec -T postgres sh -lc "pg_restore -U nexora -d nexora_restore_verify /tmp/nexora_backup.dump"
Invoke-Step docker compose exec -T postgres sh -lc "psql -U nexora -d nexora_restore_verify -v ON_ERROR_STOP=1 -c \"select count(*) as restored_table_count from information_schema.tables where table_schema = 'public';\""
Invoke-Step docker compose exec -T postgres sh -lc "dropdb -U nexora --if-exists nexora_restore_verify"

Add-Log "BACKUP_RESTORE_CERTIFICATION_PASSED"
Add-Log "certification-output\backup-restore.log"
