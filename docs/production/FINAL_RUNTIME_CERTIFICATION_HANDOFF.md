# Final Runtime Certification Handoff

## Current project state

Source remediation passes R0–R21 are complete at source-gate level. R22 adds the final local/CI runtime execution handoff.

## Current decision

`HOLD_SOURCE_COMPLIANT_RUNTIME_EXECUTION_REQUIRED`

This is not a source architecture failure. It means the project still needs proof from a real runtime environment.

## Production GO rule

Production GO is allowed only when all of the following are true:

- `pnpm-lock.yaml` exists and is committed.
- `pnpm install --frozen-lockfile` passes.
- lint, typecheck, tests and build pass.
- Prisma schema validation and migrations pass.
- Docker Compose brings up web, api, worker, postgres, redis, minio and nginx.
- API readiness and liveness endpoints pass.
- MinIO document upload/download evidence is generated.
- worker/report job evidence is generated.
- E2E workflow tests pass.
- security smoke tests pass.
- backup/restore evidence is generated.
- final go/no-go output marks `GO_CANDIDATE_RUNTIME_CERTIFIED`.

## Runtime evidence files

R22 writes evidence to:

```txt
certification-output/pass-r22-final-runtime-unblocker/
```

Important files:

```txt
r22-final-runtime.log
r22-final-runtime-result.json
r22-step-summary.tsv
```

## What not to do

- Do not manually create a fake lockfile.
- Do not bypass frozen install.
- Do not call source-only gates production proof.
- Do not mark modules complete if runtime tests fail.
- Do not change the locked stack to make tests easier.

## Final handoff summary

No more source-planning passes are needed unless runtime execution exposes real defects. If runtime fails, fix the defect directly and rerun R22. If R22 passes, the archive becomes a production GO candidate pending owner review.
