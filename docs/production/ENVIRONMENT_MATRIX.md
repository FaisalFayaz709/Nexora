# Production Environment Matrix

No real production secret is stored in this file. Values must come from the deployment platform or secret manager.

| Variable | Purpose | Production rule |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | Must be `production` for web/API/worker. |
| `DATABASE_URL` | PostgreSQL connection | Secret manager value only; no local placeholder. |
| `REDIS_URL` | Redis/BullMQ connection | Secret manager value only. |
| `MINIO_ENDPOINT` | MinIO endpoint | Internal HTTPS endpoint or private network endpoint. |
| `MINIO_ACCESS_KEY` | MinIO access key | Secret manager value only. |
| `MINIO_SECRET_KEY` | MinIO secret key | Secret manager value only. |
| `MINIO_PRIVATE_BUCKET` | Private object bucket | Production bucket with anonymous access disabled. |
| `MINIO_PUBLIC_BUCKET` | Static public object bucket | Public only for explicitly approved static assets. |
| `AUTH_ACCESS_TOKEN_SECRET` | Access-token signing secret | Secret manager value with rotation plan. |
| `AUTH_MFA_ENCRYPTION_KEY` | MFA secret encryption key | Secret manager value with backup/rotation plan. |
| `AUTH_REFRESH_COOKIE_NAME` | Refresh cookie name | Stable production cookie name. |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS` | Access token TTL | Short-lived token window. |
| `AUTH_SESSION_TTL_SECONDS` | Server-side session TTL | Aligned with security policy. |
| `AUTH_LOGIN_RATE_LIMIT` | Login abuse limit | Must be enabled. |
| `AUTH_MFA_RATE_LIMIT` | MFA abuse limit | Must be enabled. |
| `DOCUMENT_MAX_UPLOAD_BYTES` | Upload size guard | Must match security policy. |
| `DOCUMENT_ENFORCE_OBJECT_CHECKSUM` | Upload integrity | Must be `true`. |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency | Sized for target runtime. |
| `WORKER_SCHEDULERS_ENABLED` | Scheduled jobs | Enabled after migration and seed verification. |
| `OPENAPI_DOCS_ENABLED=false` | Public docs exposure | Must remain false in production unless explicitly allowed behind admin auth. |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend API base path | Must route through `/api/v1` behind Nginx. |

## Secret-placeholder blocking rule

Any value containing `change-me`, `local-only`, `example`, `placeholder`, `dev-only`, or a copied sample secret blocks production deployment.
