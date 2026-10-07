# NEXORA ERP — Locked Architecture Rules

## Architectural style

NEXORA is an **opinionated domain-first modular monolith** in a single TypeScript monorepo. It remains one coordinated deployable system until independent scaling requirements justify extraction.

## Repository target structure

```text
nexora-erp/
├── frontend/
│   └── src/{app,modules,components,layouts,hooks,lib}
├── backend/
│   └── src/{config,core,plugins,modules,types}
├── worker/
│   └── src/{queues,processors,schedulers}
├── shared/
│   └── src/{contracts,schemas,enums,constants,permissions,utils}
├── database/
│   ├── prisma/{schema.prisma,models,migrations,seed}
│   └── src/client.ts
├── infrastructure/{docker,nginx,terraform}
├── docs/
├── tests/e2e/
└── .github/workflows/
```

## Mandatory module-boundary rules

1. Every business feature belongs to exactly one owning domain module.
2. Routes and controllers never call Prisma directly.
3. Module A cannot import Module B repositories or private services.
4. Synchronous cross-module calls use the target module's public facade.
5. Non-critical asynchronous side effects use domain events / BullMQ.
6. Critical changes that must remain consistent are committed in one PostgreSQL transaction.
7. Prisma-generated types are internal persistence types; shared API contracts are separate.
8. Frontend imports only browser-safe shared packages, never backend/database packages.
9. All tenant-owned queries require authenticated tenant context.
10. Critical mutations emit a business audit event.
11. Every module exposes only its `index.ts` / facade public surface to sibling modules.
12. Every queue handler must be idempotent or safely retryable.

## Layer responsibility matrix

| Layer | Allowed | Forbidden |
|---|---|---|
| Route | URL, method, schema binding, pre-handlers, controller binding | Business rules, Prisma queries |
| Controller | Translate HTTP input/output, status codes | Business calculations, direct DB access |
| Service | Business rules, orchestration, scope checks, transaction coordination | HTTP response formatting |
| Repository | Persistence queries for module-owned entities | Calling controllers; exposing DB types as API |
| Mapper | Persistence/domain → API DTO mapping | Database writes |
| Facade | Public synchronous API for sibling modules | Leaking repositories/private services |
| Event handler | Non-critical side effects/reactions | Replacing atomic business transactions |

## Shared-package browser safety

The shared package may contain browser-safe contracts, schemas, enums, constants, permissions and pure utilities.

The following must never live in the browser-safe shared package:

- JWT signing
- password hashing
- MinIO credentials
- Prisma client
- secret environment access
- server-only cryptography
