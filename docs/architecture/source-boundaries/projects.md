# Source Boundary

## Source-locked

Project entities:
Project, ProjectPhase, ProjectTask, ProjectTaskDependency, ProjectMilestone,
ProjectMember, BillOfMaterials, BOMItem, ProjectBudget, ProjectBudgetLine,
ProjectExpense, ProjectRisk, ProjectIssue and ProjectHandover.

Canonical Project statuses:
DRAFT, PLANNED, ACTIVE, ON_HOLD, COMPLETED, HANDED_OVER, CANCELLED.

Functional ProjectTask statuses:
NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED.

Locked public API:
exactly 16 Project routes from the source catalog. No Milestone, Phase, Member,
Risk, Issue or Budget-write route has been invented.

Source events:
- project.created
- project.handed_over

The source create-project example is preserved exactly as the minimum structural
contract: customerId, contractId, siteId, name, managerId, startDate, dueDate
and contractValue.

## Implementation-derived, not claimed source-locked

The PDF does not print:
- exact payloads for most Project routes;
- ProjectPhase/BOM/Budget/Milestone/Risk/Issue/Handover status catalogs;
- a public write route for phases, milestones, project members, budget lines,
  risks or issues;
- explicit Project/ProjectTask transition matrices;
- a budget-write API;
- a Contract table before the CRM capability is introduced;
- Expense and Document tables before their owning passes.

This implementation therefore:
- derives controlled Project and ProjectTask transition matrices;
- derives small internal status sets for Phase/BOM/Budget/Milestone/Risk/Issue/Handover;
- creates one default `Execution` phase and one zero-value draft ProjectBudget
  when a Project is created so their source entities exist without inventing
  public routes;
- keeps ProjectExpense.expenseId and ProjectHandover.documentId as deferred FKs;
- keeps Project.contractId without a physical FK until the Contract owner exists;
- exposes budget as read-only because the locked catalog contains only GET budget.

These decisions are explicitly implementation-derived and may be replaced only
by an approved contract update, not silently presented as source text.
