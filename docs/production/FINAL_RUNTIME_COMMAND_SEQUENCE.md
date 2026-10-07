# Final Runtime Command Sequence

Run these commands from the repository root on a machine with Node 22, pnpm, Docker Desktop/Engine and internet access.

## 1. Enable pnpm and generate the lockfile

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

Commit the generated `pnpm-lock.yaml`.

## 2. Verify frozen install and source gates

```bash
pnpm install --frozen-lockfile
pnpm pass:r22:source-check
pnpm pass:r21:source-check
pnpm verify:static
```

## 3. Quality and build checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
```

## 4. Docker runtime certification

```bash
docker compose config
docker compose build
docker compose up -d
```

Then verify services:

```bash
curl -f http://localhost:8080/healthz
curl -f http://localhost:8080/api/v1/health/live
curl -f http://localhost:8080/api/v1/health/ready
```

## 5. Database and seed

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:migrate:status
pnpm db:seed
```

## 6. E2E and security smoke

```bash
pnpm test:e2e:browser:strict
pnpm security:smoke:preflight
pnpm full-workflow:e2e:certify
pnpm production-release:certify
```

## 7. Final R22 one-command option

Instead of running the commands manually, run:

```bash
bash scripts/pass-r22-final-runtime-unblocker.sh
```

or:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pass-r22-final-runtime-unblocker.ps1
```
