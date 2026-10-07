# Source Boundary

## Source-locked

- Approval Engine is configurable rather than hard-coded.
- ApprovalDefinition: organizationId, subjectType, name, conditionJson, active.
- ApprovalStepDefinition: approvalDefinitionId, sequence, approverType, approverRef, minApprovals.
- ApprovalRequest: organizationId, subjectType, subjectId, definitionId, status, requestedById.
- ApprovalStep: approvalRequestId, sequence, approverType, approverRef, status.
- ApprovalAction: approvalStepId, actorId, action, comment, actedAt.
- Canonical ApprovalRequest statuses: PENDING, IN_PROGRESS, APPROVED, REJECTED, RETURNED, CANCELLED.
- Approval inbox is resolved by role/user scope.
- Rejection requires a comment.
- Maker-checker is mandatory.
- Purchase approval transaction includes approval action + status transition + next approval state + audit.
- Approval state is synchronous PostgreSQL state, not eventual consistency.

## Implementation-derived and explicitly documented

The source does not print canonical ApprovalStep statuses or an exact JSON grammar for conditionJson. It also does not state whether approverRef is a User or Role ID.

This implementation therefore uses:
- approverType `USER | ROLE`;
- ApprovalStep states `WAITING | PENDING | APPROVED | REJECTED | RETURNED | CANCELLED`;
- deterministic `all`/`any` condition rules using `EQ, NE, GT, GTE, LT, LTE, IN`;
- supporting branchId/contextJson/timestamps/minApprovals fields;
- PurchaseRequest: final approve -> APPROVED, reject -> REJECTED, return -> DRAFT;
- PurchaseOrder: final approve -> APPROVED, reject/return -> DRAFT because Appendix A defines no REJECTED/RETURNED PO status.

These are implementation contracts, not claimed source-locked payload additions.
