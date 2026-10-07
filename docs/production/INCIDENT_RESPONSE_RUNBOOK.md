# PASS 24 Incident Response Runbook

## Production incident classes

- P0: tenant isolation breach, money/stock corruption, authentication bypass, production outage.
- P1: degraded runtime, failed worker queue, restore failure, missing critical alert.
- P2: non-critical UI/API degradation with workaround.

## Minimum evidence

- incident ID,
- owner,
- start/end time,
- impacted tenants/modules,
- timeline,
- root cause,
- containment,
- rollback decision,
- customer communication decision,
- post-incident corrective actions,
- audit-log sample.

PASS 24 final GO requires zero open P0/P1 incidents.
