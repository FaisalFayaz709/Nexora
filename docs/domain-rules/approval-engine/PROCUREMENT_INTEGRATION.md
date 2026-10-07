# Procurement Integration

Purchase Request and Purchase Order approvals now use the generic Approval Engine.

- PR submit creates an ApprovalRequest and moves PR to UNDER_REVIEW.
- PR direct approve/reject acts on the current generic workflow step.
- Final PR approval atomically moves PR to APPROVED.
- PR rejection atomically moves PR to REJECTED.
- Generic return moves PR to DRAFT for correction.
- PO submit creates an ApprovalRequest and moves PO to APPROVAL_PENDING.
- PO direct approve acts on the current generic workflow step.
- Final PO approval atomically moves PO to APPROVED.
- Generic reject/return moves PO to DRAFT because no canonical PO REJECTED/RETURNED states exist.

The Approval Engine reaches Procurement only through ProcurementFacade.
