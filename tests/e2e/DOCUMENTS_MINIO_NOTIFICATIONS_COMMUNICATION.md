# M15 Runtime E2E Scenarios — Documents, MinIO, Notifications and Communication

These scenarios must be converted into executable API/database/object-storage tests during local runtime certification.

1. `M15-RUNTIME-UPLOAD-INTENT-USES-PRIVATE-TENANT-PREFIX-AND-AUDIT`
   - Login as document creator.
   - Request upload intent.
   - Assert returned object key starts with `organizations/{organizationId}/documents/`.
   - Assert no MinIO credentials are returned.
   - Assert upload-intent audit row exists.

2. `M15-RUNTIME-COMPLETE-UPLOAD-VERIFIES-MINIO-OBJECT-SIZE-CHECKSUM`
   - Upload object to presigned URL.
   - Complete upload with matching checksum and size.
   - Assert document, version, access/audit and business event are committed.
   - Repeat with wrong checksum and assert rejection.

3. `M15-RUNTIME-ADD-VERSION-INCREMENTS-VERSION-AND-UPDATES-CURRENT-ATOMically`
   - Add a second version.
   - Assert version number increments and currentVersionId points to the new version.

4. `M15-RUNTIME-DELETE-BLOCKED-BEFORE-RETENTION-EXPIRY`
   - Create document with future retentionUntil.
   - Attempt delete and assert rejection.
   - Confirm no destructive version/object metadata deletion occurred.

5. `M15-RUNTIME-DOWNLOAD-URL-ACCESS-LOG-AND-CROSS-TENANT-DENIAL`
   - Generate download URL as same tenant user.
   - Assert access log action `DOWNLOAD_URL`.
   - Attempt from another tenant and assert denial.

6. `M15-RUNTIME-COMMUNICATION-ATTACHMENT-CROSS-TENANT-DOCUMENT-BLOCKED`
   - Send email communication with same-tenant document attachment and assert success.
   - Attempt attachment from another tenant and assert rejection.

7. `M15-RUNTIME-EMAIL-OUTBOX-IDEMPOTENCY-KEY-UNIQUE-PER-TENANT`
   - Send email communication.
   - Assert EmailOutbox row includes idempotencyKey.
   - Retry/worker process cannot duplicate delivery state.

8. `M15-RUNTIME-NOTIFICATION-FANOUT-DEDUPES-AND-READ-STATE-USER-SCOPED`
   - Fan-out with duplicate recipients is rejected or deduped before write.
   - User A read state cannot mark User B notification.

9. `M15-RUNTIME-DOCUMENT-EXPIRY-SCAN-EMITS-NOTIFICATION-ONCE`
   - Seed expiring document.
   - Run scan twice for same window.
   - Assert one notification/communication event.

10. `M15-RUNTIME-WORKER-DELIVERY-DOES-NOT-MUTATE-STOCK-MONEY-APPROVAL`
    - Submit email, notification and document scan jobs.
    - Assert processor rejects payloads that include stock/money/approval mutation keys.
