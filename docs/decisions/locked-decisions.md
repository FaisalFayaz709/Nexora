# NEXORA ERP — Locked Decisions Register

This register is the baseline freeze change-control baseline.

| ID | Decision | State |
|---|---|---|
| ADR-LOCK-001 | Architecture = opinionated domain-first modular monolith | LOCKED |
| ADR-LOCK-002 | One TypeScript monorepo, workspace-managed root installation | LOCKED |
| ADR-LOCK-003 | Frontend = Next.js + TypeScript | LOCKED |
| ADR-LOCK-004 | Backend = Fastify + TypeScript | LOCKED |
| ADR-LOCK-005 | Database = PostgreSQL | LOCKED |
| ADR-LOCK-006 | ORM / migrations = Prisma | LOCKED |
| ADR-LOCK-007 | Contracts/validation = shared browser-safe Zod | LOCKED |
| ADR-LOCK-008 | Object storage = MinIO through StorageService | LOCKED |
| ADR-LOCK-009 | Redis = cache/locks/rate-limit state/BullMQ transport | LOCKED |
| ADR-LOCK-010 | BullMQ = background/scheduled non-critical work | LOCKED |
| ADR-LOCK-011 | API = HTTPS JSON REST under `/api/v1` | LOCKED |
| ADR-LOCK-012 | Tenant isolation = server-side authenticated membership context | LOCKED |
| ADR-LOCK-013 | Cross-module sync = public facade only | LOCKED |
| ADR-LOCK-014 | Critical state consistency = PostgreSQL transaction | LOCKED |
| ADR-LOCK-015 | Stock/journal/audit ledgers = append-only or reversal based | LOCKED |
| ADR-LOCK-016 | Money = DECIMAL/NUMERIC, never float | LOCKED |
| ADR-LOCK-017 | Time persisted UTC; organization timezone for display/business calendars | LOCKED |
| ADR-LOCK-018 | Human business numbers separate from UUID PKs; tenant-unique | LOCKED |
| ADR-LOCK-019 | Nginx + Docker/Compose baseline deployment | LOCKED |
| ADR-LOCK-020 | GitHub Actions CI/CD | LOCKED |
| ADR-LOCK-021 | No AI dependency for application functionality | LOCKED |
| ADR-LOCK-022 | Addendum modules extend, not replace, the approved architecture | LOCKED |
| ADR-LOCK-023 | Module Definition of Done includes auth/scope/validation/state/audit/transactions/tests/docs/errors/migrations/logging | LOCKED |
| ADR-LOCK-024 | Breaking API changes are versioned, never silent | LOCKED |

## Change control

A locked decision may only change after:
1. explicit user/product-owner approval;
2. an updated specification/ADR;
3. API/data migration impact analysis;
4. test/rollback plan;
5. update to this register.

Until then, implementation must conform to the locked decision.
