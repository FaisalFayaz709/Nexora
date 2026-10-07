# Observability and Alerting Runbook

## Signals

Every production request must carry a request ID and correlation ID through API logs, audit logs, worker evidence and external document/report workflows.

## Required checks

- Structured API and worker logs are enabled.
- Metrics endpoint is reachable.
- Tracing is enabled for key workflow paths.
- Health and readiness endpoints expose dependency state.
- Log redaction proves password, token, cookie, API key, secret and OTP values are not emitted.
- Audit sample exists for a critical mutation.
- Production log retention is documented for at least 30 days.

## Alerts

Alert rules must cover API readiness, PostgreSQL connectivity, Redis connectivity, MinIO connectivity, BullMQ lag/stalled jobs, backup failure, restore failure and security anomaly spikes.

## On-call

The on-call runbook must define severity, owner, escalation path, rollback trigger and communication template.
