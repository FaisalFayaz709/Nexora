# Concurrency Acceptance

The static design includes row-level `FOR UPDATE` locking and unique/check constraints. Production acceptance still requires real PostgreSQL concurrency tests.

Required runtime tests:

1. Seed onHand=100 and fire concurrent reservations totaling >100.
   - ACTIVE reservation sum must never exceed 100.
   - StockBalance.reserved must equal committed ACTIVE reservations.

2. Seed onHand=10 and concurrently dispatch two transfers of qty=8.
   - At most one may commit.
   - Source onHand and ledger must reconcile.

3. Retry dispatch after IN_TRANSIT.
   - No second source movement is allowed.

4. Retry receive after RECEIVED.
   - No second destination movement is allowed.

5. Concurrent adjustment post calls.
   - Exactly one posting effect/ledger set may commit.

6. Serialized transfer.
   - The same serial cannot be committed into two dispatch movements.

7. Cross-tenant and cross-branch IDs.
   - Must be denied before mutation.

These tests are runtime-pending only because the generator environment does not have the installed Prisma/PostgreSQL runtime.
