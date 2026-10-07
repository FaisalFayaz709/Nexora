# M11 Project/BOM/Budget/Costing Runtime Acceptance

These are the runtime scenarios that must replace any source-only confidence before M11 can be fully certified.

1. M11-PROJECT-CREATE-SITE-MANAGER-SCOPE: create project only when customer site and manager belong to the tenant.
2. M11-PROJECT-COMPLETION-READINESS-BLOCKS-OPEN-WORK: project cannot move to COMPLETED while open tasks or pending milestones exist, or when approved BOM is missing.
3. M11-PROJECT-BOM-APPROVAL-SUPERSEDES-PRIOR-VERSION: approving a new BOM supersedes the previous approved version.
4. M11-PROJECT-BOM-SHORTAGE-CREATES-MATERIAL-REQUIREMENT: approved BOM shortage creates a procurement material requirement in one transaction.
5. M11-PROJECT-BUDGET-UPsert-AND-APPROVAL-VERSIONING: budget line categories are unique, positive and versioned.
6. M11-PROJECT-COSTING-MERGES-PROCUREMENT-AND-FINANCE-COSTS: costing read model combines contract value, approved/latest budget, procurement committed/received costs and finance expense costs.
7. M11-PROJECT-TIMELINE-HAS-BUDGET-BOM-PROCUREMENT-HANDOVER-EVENTS: timeline includes local project delivery and procurement events.
8. M11-PROJECT-HANDOVER-REQUIRES-COMPLETED-STATE: handover is rejected before COMPLETED and audited after success.
