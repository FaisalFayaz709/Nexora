# Number Sequence — Production Acceptance

The additional Definition of Done requires concurrent requests to never generate duplicate numbers and requires reset behavior to be tested by fiscal year, branch and organization.

Static controls present:
- unique organization + branchScopeKey + entityType + fiscalYear sequence scope;
- atomic database increment;
- unique sequence + reservedNumber reservation;
- unique organization + businessNumber reservation;
- reservation and target creation in one transaction;
- public API cannot issue a number directly;
- reset is permission-protected and audited.

Runtime PostgreSQL acceptance still required:
1. 50+ concurrent allocations in one org scope;
2. same test independently across branches;
3. same test across fiscal years;
4. target-creation failure proves allocation/reservation rollback;
5. reset of one scope does not mutate another branch/year scope.

## PASS 04 clarification

The number sequence service is transaction-safe: allocation, `NumberSequenceReservation`, target entity creation and reservation consumption must happen in one PostgreSQL transaction boundary. Every tenant-owned sequence and reservation is scoped by `organizationId`; branch-owned numbering adds `branchId`, `branchScopeKey` and fiscal year so business numbers remain deterministic and duplicate-safe.
