# R20 CI/CD Hardening Runbook

## Local source gate

```bash
node scripts/check-pass-r20-cicd-hardening.mjs --source-only
```

## Local certification wrapper

```bash
bash scripts/pass-r20-cicd-hardening-certify.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pass-r20-cicd-hardening-certify.ps1
```

## Required GitHub setup

1. Push the R20 archive source to the repository.
2. Ensure `pnpm-lock.yaml` is generated and committed.
3. Enable branch protection for `main` using `docs/production/BRANCH_PROTECTION_RULES.md`.
4. Enable required workflows:
   - CI
   - R20 CI/CD Hardened Gate
   - CodeQL
   - Semgrep
   - Runtime Certification
5. Make these checks required before merge:
   - Source architecture gates R0-R20
   - Frozen install, quality, tests, build
   - Appendix G frontend gates
   - Backend boundaries and security gates
   - Docker build and smoke
   - E2E smoke source gate
   - R20 gate summary
   - CodeQL
   - Semgrep

## Required local sequence before pushing a release candidate

```bash
pnpm install --frozen-lockfile
pnpm verify:static
pnpm format:check
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm db:generate
pnpm db:migrate:status
pnpm test
pnpm build
pnpm audit --audit-level high
docker compose config
docker compose build web api worker
pnpm test:e2e:browser
```

## Runtime certification

R20 does not replace R19. For runtime proof, run:

```bash
bash scripts/pass-r19-docker-runtime-certification.sh
```

The project remains HOLD until the real CI and runtime evidence exist.
