# Full Lifecycle E2E Runtime Runbook

This runbook is the PASS M18 runtime proof plan for the locked NEXORA lifecycle. It is intentionally production-blocking.

The full lifecycle must prove customer→contract→project continuity, project BOM and material requirement continuity, procurement→inventory→asset continuity, service→maintenance→finance continuity, and supporting document, notification, reporting, portal, audit and security evidence.

## Command

Run this only after the real `pnpm-lock.yaml` exists, Docker Compose has started the locked topology, migrations have applied, seed data exists, and the API is reachable.

```bash
export RUN_FULL_WORKFLOW_E2E=1
export RUN_FULL_WORKFLOW_E2E_STRICT=1
export NEXORA_API_BASE_URL=${NEXORA_API_BASE_URL:-http://127.0.0.1:8080/api/v1}
pnpm full-workflow:e2e:certify
```

Windows PowerShell:

```powershell
$env:RUN_FULL_WORKFLOW_E2E = "1"
$env:RUN_FULL_WORKFLOW_E2E_STRICT = "1"
$env:NEXORA_API_BASE_URL = "http://127.0.0.1:8080/api/v1"
pnpm full-workflow:e2e:certify
```

## Important safety rule

The route probe output is not release sign-off. PASS M18 verifies the certification gate and the lifecycle command-chain coverage, but production remains blocked until `certification-output/full-lifecycle-e2e/runtime-results.json` exists with:

- `status: PASSED`
- zero failed and zero skipped critical scenarios
- every C17 scenario family in `passedScenarioIds`
- an evidence manifest checksum
- before/after snapshots for stock, finance, approval, asset history, document/report and audit traces

## Runtime evidence file

Strict mode reads:

```text
certification-output/full-lifecycle-e2e/runtime-results.json
```

This file must be produced by executable browser/API workflow tests, not by manual editing.

## Required lifecycle segments

1. Health and runtime readiness.
2. Login, current user and tenant membership resolution.
3. Organization and branch context.
4. Customer and customer site creation/lookup.
5. Contract/project creation.
6. Project BOM approval and material requirement.
7. Purchase request, approval, RFQ, supplier quotation, selection and PO.
8. GRN and stock ledger update.
9. Serial/batch trace and asset registration/installation/QR.
10. Ticket, SLA, work order, technician visit and service report.
11. Preventive/corrective maintenance execution.
12. Supplier/customer invoice, three-way match, journal and payment.
13. Documents, notifications, report export, search, calendar and timeline.
14. Customer/vendor/technician portal scope.
15. Cross-tenant denial, maker-checker denial and abuse cases.
16. Failure injection and rollback/no-partial-state evidence.
17. Release evidence manifest and checksum.

## Production decision

Do not mark a release production-ready until `pnpm final:certify` runs the strict full lifecycle E2E gate successfully and the evidence folder is attached to the release record.
