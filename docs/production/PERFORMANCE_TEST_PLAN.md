# Performance Test Plan

## Purpose

Prove that the release candidate meets production performance SLOs without changing the locked stack.

## Required SLOs

| Metric | Gate |
| --- | --- |
| `api_p95_ms` | <= 500 ms |
| `api_error_rate_pct` | <= 1% |
| `db_query_p95_ms` | <= 250 ms |
| `report_export_p95_ms` | <= 30000 ms |
| `frontend_lcp_ms` | <= 2500 ms |
| `worker_queue_lag_seconds` | <= 60 seconds |
| `failed_request_count` | 0 |

## Required evidence

- API load-test log with route, request count, p95 latency and error rate.
- PostgreSQL hot-query `EXPLAIN/ANALYZE` evidence for tenant/branch/date scoped lists and reports.
- Report export timing evidence for CSV/XLSX/PDF jobs.
- Browser timing evidence for LCP and key workflow screens.
- Queue lag, retry and DLQ evidence.

## Blocker

Production remains HOLD when any SLO is outside threshold or query-plan evidence is missing.
