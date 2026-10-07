# Release Candidate Runbook

## Goal

Promote a source/static-complete build into a production release candidate without deviating from the locked stack or architecture.

## Required command sequence

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm verify:static
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm db:generate
docker compose config
docker compose build web api worker
docker compose up -d postgres redis minio migrator api worker web nginx
pnpm docker:runtime:certify
pnpm security:smoke:preflight
RUN_FULL_WORKFLOW_E2E=1 NEXORA_API_BASE_URL=http://localhost:3001/api/v1 pnpm full-workflow:e2e:certify
RUN_PRODUCTION_RELEASE=1 NEXORA_API_BASE_URL=http://localhost:3001/api/v1 pnpm production-release:certify
```

## Required outputs

- `certification-output/final-certification.log`
- `certification-output/full-workflow-e2e/results.json`
- `certification-output/full-workflow-e2e/manifest.json`
- `certification-output/security-smoke-results.json`
- `certification-output/backup-restore.log`
- `certification-output/production-release/release-candidate-manifest.json`
- `certification-output/production-release/gate-evidence.json`
- `certification-output/production-release/command-results.json`

## Release decision

Do not deploy to production unless the production release manifest says `READY_FOR_GO_NOGO_APPROVAL` and the Go/No-Go record is explicitly GO.


## R19 Docker runtime certification

After the frozen install, build and source gates pass, run the dedicated R19 runtime gate:

```bash
bash scripts/pass-r19-docker-runtime-certification.sh
```

Attach `certification-output/docker-runtime-r19/` to the release packet. Production remains HOLD unless this evidence is present.
