# M18 Frontend Runtime UX, RBAC and Workflow E2E Checklist

## M18-RUNTIME-ROLE-NAVIGATION-PERMISSION-SCOPED

For every seeded role, sign in and confirm that AppShell renders only routes whose `requiredPermission` exists in the session permission list. Direct URL navigation must still be rejected by backend RBAC when a user is not authorized.

## M18-RUNTIME-FEATURE-FLAG-MODULE-SCOPED

Disable a module feature flag and verify the related navigation disappears. Re-enable it and verify the navigation returns only for roles that also have permission.

## M18-RUNTIME-TENANT-CONTEXT-HEADER-PROPAGATION

Select each active membership and verify API calls include the selected `x-organization-id`. Store an invalid organization ID and confirm it is discarded during `/auth/me` refresh.

## M18-RUNTIME-WORKFLOW-COMMAND-GATES

On `/workflow-completion`, verify command buttons are blocked until required IDs, permission, idempotency key and high-risk confirmation are present. Verify impossible status transitions stay blocked by backend state validation.

## M18-RUNTIME-TANSTACK-QUERY-INVALIDATION

Execute a safe command and prove all listed invalidation keys are refetched after success.

## M18-RUNTIME-DOCUMENT-EVIDENCE-UPLOAD-INTENT

Attach a photo/signature/report output and verify the UI uses upload-intent/document access paths, not direct object-store shortcuts.

## M18-RUNTIME-PORTAL-PWA-OFFLINE-UI-GUARDS

Customer, vendor and technician views must preserve linked-subject scope. Offline commands must replay idempotently and reject stale/conflicting state.

## M18-RUNTIME-ERROR-EMPTY-LOADING-DENIED-STATES

Each module route must show clean loading, empty, error and denied states without leaking unauthorized tenant, branch, asset, customer, vendor or invoice IDs.

## M18-RUNTIME-NO-FRONTEND-CRITICAL-STATE-BYPASS

Inspect network and source evidence: stock, money, approvals, journal entries, invoice balances, asset lifecycle and work-order state are changed only through public API command endpoints.
