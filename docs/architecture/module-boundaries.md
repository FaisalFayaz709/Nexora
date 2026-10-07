# NEXORA ERP — Domain Ownership & Module Boundaries

This file freezes the owning domains used for implementation planning.

| Domain | Owns |
|---|---|
| Identity | Users, sessions, MFA, membership identity, authentication |
| Organization | Organizations, branches, departments, teams, settings |
| RBAC / Authorization | Roles, permissions, role assignments, scope enforcement |
| HR | Employees, skills, certifications, attendance, leave, payroll |
| CRM / Sales | Leads, opportunities, site surveys, quotations, sales orders, contracts, service packages |
| Customers | Customers, contacts, customer sites, buildings/areas |
| Vendors | Vendor master, contacts, vendor products, performance |
| Procurement | Material requirements, purchase requests, RFQs, supplier quotations, POs, GRNs, receiving quality |
| Inventory | Products, categories, UOM, warehouses, locations, balances, stock ledger, reservations, transfers, serials, batches, adjustments |
| Projects | Projects, phases, tasks, milestones, teams, BOM, budgets, risks, issues, handover |
| Assets | Assets, installation, history, warranty, QR, RMA |
| Service | Tickets, comments, SLA, work orders, assignments, service reports, technician operational profile |
| Maintenance | Plans, schedules, executions, checklists, maintenance parts |
| Finance | AR/AP invoices, payments, allocations, expenses, financial periods, chart of accounts, journals, credit/debit notes |
| Approvals | Approval definitions, steps, runtime approval requests/actions, maker-checker |
| Documents | Document metadata, versions, links, expiry handling, storage abstraction |
| Notifications / Communications | In-app notifications, email outbox, communication logs/delivery history |
| Eventing / Integrations | Business events, webhook endpoints/deliveries |
| Reporting | Reports, exports, saved reports, scheduled reports, dashboard widgets/views |
| Platform | Search, calendar, health, feature/module configuration, idempotency, number sequences |
| Advanced Operations | Fleet, tools, safety incidents, corrective actions, inspections |
| SaaS Platform | Plans, tenant subscriptions, usage/storage metrics, platform billing |
| Import | Import templates/batches/mappings/row validation/rollback |
| Field Visit Verification | Check-in/out, optional GPS proof, route/location records |

## Cross-domain communication rule

- **Synchronous + business-critical:** target-domain facade.
- **Same atomic effect:** same database transaction coordinated by the owning service/facade.
- **Non-critical side effect:** business event / BullMQ after commit.
- **Never:** direct import of another domain's repository/private service.
