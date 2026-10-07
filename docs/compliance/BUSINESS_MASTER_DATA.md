# capability gate — Business Master Data Completion

## Source of truth

This implementation implements the missing business-master hardening layer while preserving the locked NEXORA blueprint. It does not change the approved stack or convert the modular monolith into another architecture.

## Scope

capability gate covers the master data that downstream workflows depend on:

- Employees
- Customers
- Customer Sites
- Vendors
- Product Categories
- Units of Measure
- Products
- Warehouses
- Warehouse Locations
- Vendor/Product approved supply links

## Locked compliance decisions

- Frontend remains Next.js + TypeScript.
- Backend remains Fastify + TypeScript.
- Persistence remains PostgreSQL + Prisma.
- The repository layer remains the only place where Prisma access is allowed.
- Routes/controllers do not call Prisma directly.
- Cross-module dependencies remain facade-based.
- Tenant scope is mandatory on tenant-owned master records.
- Branch scope applies to operational branch-owned masters such as employees and warehouses.
- Create/update master mutations must write audit events.
- Master-data imports must go through the import framework instead of ad-hoc scripts.

## What this implementation adds

- Shared browser-safe `BusinessMasterRoutes` registry.
- Backend `business-master-policy` for immutable-field and list-policy guardrails.
- Master-data dashboard route for operational navigation.
- Static gate that verifies the business-master code surface, database entities, frontend pages and locked-architecture guardrails.

## Runtime completion still required locally

The archive is source/static complete. Runtime completion still requires:

```bash
pnpm business-masters:check
pnpm architecture:check
pnpm contracts:check
pnpm db:validate
pnpm test
pnpm build
```

Business-master runtime tests must prove cross-tenant denial, branch-scope denial, duplicate code/SKU rejection, audit creation and validated update behavior.
