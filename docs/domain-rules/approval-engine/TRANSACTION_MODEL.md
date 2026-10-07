# Approval Transaction Model

## Request creation
The owning domain creates ApprovalRequest in its existing PostgreSQL transaction:
subject validation -> exactly one matching active definition -> cloned steps -> first active step -> approval request -> subject approval state/link -> audit -> commit.

## Approve
One PostgreSQL transaction:
lock request -> lock current step -> tenant/branch scope -> USER/ROLE eligibility -> maker-checker -> one-action-per-actor -> append ApprovalAction -> evaluate minApprovals -> complete step -> activate next step or complete request -> final subject transition through public facade -> audit -> commit.

## Reject / Return
One PostgreSQL transaction:
lock request/step -> eligibility + maker-checker -> rejection comment rule -> append ApprovalAction -> complete request -> subject transition through public facade -> audit -> commit.

No BullMQ is used for approval state. Notifications can occur only after commit.
