# R19 Docker Runtime Certification Runbook

## Purpose

`R19_DOCKER_RUNTIME_CERTIFICATION` turns the source-complete archive into a Docker-runtime-tested release candidate without changing the locked stack or architecture.

## Preconditions

- Docker Desktop must be running.
- Node.js 22 must be available.
- Corepack must be available.
- The machine must have access to the npm registry at least once to generate/install the lockfile.
- `pnpm-lock.yaml` must exist and be committed before the frozen install step.
- Ports must be free; default gateway port is `8080`.

## Step 1 — Generate the lockfile if still missing

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
```

Commit the resulting `pnpm-lock.yaml` before claiming any runtime certification.

## Step 2 — Run R19 on Linux/macOS

```bash
bash scripts/pass-r19-docker-runtime-certification.sh
```

## Step 3 — Run R19 on Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pass-r19-docker-runtime-certification.ps1
```

## What the script proves

The script runs:

```txt
pnpm install --frozen-lockfile
pnpm verify:static
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm db:generate
pnpm build
docker compose config
docker compose build
docker compose up -d postgres redis minio
docker compose up minio-init
docker compose up migrator
docker compose up -d api worker web nginx
health checks for /healthz, /api/v1/health/live, /api/v1/health/ready and web /
R19_DOCKER_RUNTIME_MINIO_PROOF upload/download check
full-workflow:e2e:certify
```

## Evidence output

All evidence is written to:

```txt
certification-output/docker-runtime-r19
```

Required evidence:

- `r19-docker-runtime-certification.log`
- `docker-compose.config.yml`
- `docker-compose-ps.txt`
- `nginx-healthz.txt`
- `api-live.json`
- `api-ready.json`
- `web-home.html`
- `minio-upload-download-proof.txt`
- `docker-compose-logs.tail.txt`
- `r19-runtime-evidence-manifest.json`

## Optional settings

Use a different gateway port:

```bash
NEXORA_HTTP_PORT=8090 bash scripts/pass-r19-docker-runtime-certification.sh
```

Skip full workflow E2E only for troubleshooting, not for release certification:

```bash
NEXORA_R19_SKIP_FULL_WORKFLOW_E2E=1 bash scripts/pass-r19-docker-runtime-certification.sh
```

Run browser E2E as part of R19:

```bash
NEXORA_R19_RUN_BROWSER_E2E=1 bash scripts/pass-r19-docker-runtime-certification.sh
```

## Decision rule

The release remains **HOLD until the runtime script completes on a machine with Docker** and the R19 checker reports:

```txt
PASS_DOCKER_RUNTIME_CERTIFIED_WITH_EVIDENCE
```
