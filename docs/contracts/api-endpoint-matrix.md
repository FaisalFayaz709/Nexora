# API Endpoint Matrix

| Area | Method | Endpoint | Purpose | Permission | Notes | Source | Status |
|---|---|---|---|---|---|---|---|
| Approvals | GET | `/api/v1/approvals/inbox` | Current approver inbox | `approval.view` | Resolved by role/user scope | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | GET | `/api/v1/approvals/:id` | Approval request details | `approval.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/approvals/:id/approve` | Approve current step | `approval.act` | Maker-checker enforced | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/approvals/:id/reject` | Reject current step | `approval.act` | Comment required | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/approvals/:id/return` | Return for correction | `approval.act` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | GET | `/api/v1/approval-definitions` | List workflow definitions | `workflow.manage` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/approval-definitions` | Create definition | `workflow.manage` | Configurable conditions/steps | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Approvals | GET | `/api/v1/workflow-rules` | List workflow/fraud control rules | `workflow.manage` | Tenant-scoped deterministic rule registry | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | GET | `/api/v1/workflow-rules/:id` | Workflow/fraud control rule details | `workflow.manage` | Tenant scoped | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/workflow-rules` | Create workflow/fraud control rule | `workflow.manage` | Validates governed subject, conditions and actions | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | PATCH | `/api/v1/workflow-rules/:id` | Update workflow/fraud control rule | `workflow.manage` | Audited configuration change | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/workflow-rules/:id/activate` | Activate workflow/fraud control rule | `workflow.manage` | Audited state change | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/workflow-rules/:id/deactivate` | Deactivate workflow/fraud control rule | `workflow.manage` | Audited state change | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Approvals | POST | `/api/v1/workflow-rules/evaluate` | Evaluate deterministic workflow/fraud controls | `workflow.manage` | Preview/block/approval decision; no frontend-only enforcement | Appendix F / Pass 16 | IMPLEMENTED_STATIC_ONLY |
| Assets | GET | `/api/v1/assets` | List assets | `asset.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | GET | `/api/v1/assets/:id` | Get asset details | `asset.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets` | Create asset | `asset.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | PATCH | `/api/v1/assets/:id` | Update editable fields | `asset.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/register-from-stock` | Register asset from serial/stock | `asset.create` | Requires eligible serial | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/:id/install` | Install asset | `asset.install` | Atomic stock/asset history | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/:id/replace` | Replace asset | `asset.replace` | Links old/new assets | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/:id/retire` | Retire asset | `asset.retire` | Approval may apply | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | GET | `/api/v1/assets/:id/history` | Asset lifecycle history | `asset.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/:id/qr/rotate` | Rotate QR token | `asset.manage_qr` | Revokes prior token | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | GET | `/api/v1/asset-qr/:token` | Resolve QR to authorized asset view | `Authenticated/portal` | Token alone does not bypass authorization | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Assets | POST | `/api/v1/assets/:id/rma` | Create RMA | `asset.rma` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Audit | GET | `/api/v1/audit-logs` | Search audit trail | `audit.view` | Sensitive permission | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Audit | GET | `/api/v1/audit-logs/:id` | Audit event details | `audit.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/leads` | List leads | `lead.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/leads/:id` | Get lead details | `lead.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/leads` | Create lead | `lead.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | PATCH | `/api/v1/leads/:id` | Update editable fields | `lead.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/opportunities` | List opportunities | `opportunity.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/opportunities/:id` | Get opportunity details | `opportunity.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/opportunities` | Create opportunity | `opportunity.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | PATCH | `/api/v1/opportunities/:id` | Update editable fields | `opportunity.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/site-surveys` | List site surveys | `site_survey.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/site-surveys/:id` | Get site survey details | `site_survey.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/site-surveys` | Create site survey | `site_survey.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | PATCH | `/api/v1/site-surveys/:id` | Update editable fields | `site_survey.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/quotations` | List quotations | `quotation.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/quotations/:id` | Get quotation details | `quotation.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/quotations` | Create quotation | `quotation.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | PATCH | `/api/v1/quotations/:id` | Update editable fields | `quotation.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/contracts` | List contracts | `contract.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | GET | `/api/v1/contracts/:id` | Get contract details | `contract.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/contracts` | Create contract | `contract.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | PATCH | `/api/v1/contracts/:id` | Update editable fields | `contract.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/leads/:id/qualify` | Qualify lead | `lead.update` | May create opportunity | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/quotations/:id/send` | Mark/send quotation | `quotation.send` | Queues PDF/email | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/quotations/:id/accept` | Accept quotation | `quotation.approve` | May create sales order | Core §9 | IMPLEMENTED_STATIC_ONLY |
| CRM | POST | `/api/v1/contracts/:id/activate` | Activate contract | `contract.activate` | Validates dates/terms | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customers` | List customers | `customer.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customers/:id` | Get customer details | `customer.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | POST | `/api/v1/customers` | Create customer | `customer.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | PATCH | `/api/v1/customers/:id` | Update editable fields | `customer.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customer-sites` | List customer sites | `customer_site.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customer-sites/:id` | Get customer site details | `customer_site.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | POST | `/api/v1/customer-sites` | Create customer site | `customer_site.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | PATCH | `/api/v1/customer-sites/:id` | Update editable fields | `customer_site.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customers/:id/timeline` | Customer activity timeline | `customer.view` | Aggregated read model | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Customers | GET | `/api/v1/customer-sites/:id/assets` | List assets at site | `asset.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | GET | `/api/v1/documents` | List documents | `document.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | GET | `/api/v1/documents/:id` | Get document details | `document.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | POST | `/api/v1/documents` | Create document | `document.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | DELETE | `/api/v1/documents/:id` | Delete/archive resource | `document.delete` | Subject to retention rules | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | POST | `/api/v1/documents/upload-intent` | Request presigned upload | `document.create` | Validates size/type/category | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | POST | `/api/v1/documents/complete-upload` | Register completed upload | `document.create` | Checksum/object existence check | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | GET | `/api/v1/documents/:id/download-url` | Get presigned download URL | `document.view` | Short-lived and authorized | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Documents | POST | `/api/v1/documents/:id/versions` | Upload new version | `document.update` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/customer-invoices` | List customer invoices | `invoice.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/customer-invoices/:id` | Get invoice details | `invoice.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices` | Create invoice | `invoice.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | PATCH | `/api/v1/customer-invoices/:id` | Update editable fields | `invoice.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/supplier-invoices` | List supplier invoices | `supplier_invoice.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/supplier-invoices/:id` | Get supplier invoice details | `supplier_invoice.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/supplier-invoices` | Create supplier invoice | `supplier_invoice.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | PATCH | `/api/v1/supplier-invoices/:id` | Update editable fields | `supplier_invoice.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/expenses` | List expenses | `expense.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/expenses/:id` | Get expense details | `expense.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/expenses` | Create expense | `expense.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | PATCH | `/api/v1/expenses/:id` | Update editable fields | `expense.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices/:id/submit` | Submit invoice approval | `invoice.submit` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices/:id/approve` | Approve invoice | `invoice.approve` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices/:id/post` | Post invoice | `invoice.post` | May create journal entry | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices/:id/send` | Send invoice | `invoice.send` | PDF/email job | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/customer-invoices/:id/cancel` | Cancel/reverse invoice | `invoice.cancel` | No destructive delete after posting | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/supplier-invoices/:id/match` | Run three-way match | `supplier_invoice.match` | PO + GRN + invoice | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/supplier-invoices/:id/approve` | Approve supplier invoice | `supplier_invoice.approve` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/payments` | List payments | `payment.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/payments` | Record payment | `payment.create` | Idempotency key; allocations transactional | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/accounts` | Chart of accounts | `account.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/journal-entries` | Create manual journal | `journal.create` | Restricted | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | POST | `/api/v1/journal-entries/:id/post` | Post journal | `journal.post` | Immutable after posting; reverse instead | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/finance/receivables` | AR aging | `finance.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Finance | GET | `/api/v1/finance/payables` | AP aging | `finance.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/employees` | List employees | `employee.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/employees/:id` | Get employee details | `employee.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/employees` | Create employee | `employee.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | PATCH | `/api/v1/employees/:id` | Update editable fields | `employee.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/attendance` | List attendance | `attendance.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/attendance/:id` | Get attendance details | `attendance.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/leave-requests` | List leave requests | `leave.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/leave-requests/:id` | Get leave details | `leave.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/leave-requests` | Create leave | `leave.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/payroll-runs` | List payroll runs | `payroll.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | GET | `/api/v1/payroll-runs/:id` | Get payroll details | `payroll.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/payroll-runs` | Create payroll | `payroll.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/leave-requests/:id/submit` | Submit leave request | `leave.submit` | Creates approval request when required | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/leave-requests/:id/cancel` | Cancel leave request | `leave.cancel` | State transition | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/payroll-runs/:id/calculate` | Calculate payroll | `payroll.calculate` | Background-capable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/payroll-runs/:id/approve` | Approve payroll | `payroll.approve` | Maker-checker | Core §9 | IMPLEMENTED_STATIC_ONLY |
| HR | POST | `/api/v1/payroll-runs/:id/post` | Post payroll | `payroll.post` | Transactional finance integration | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/auth/login` | Authenticate user | `Public` | Rate limited; may return MFA challenge | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/auth/mfa/verify` | Complete MFA challenge | `Public/Challenge` | Rate limited | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/auth/refresh` | Rotate access session | `Session cookie` | Refresh token/session rotation | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/auth/logout` | Revoke current session | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/auth/logout-all` | Revoke all sessions | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/auth/me` | Current user/membership/permissions | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/auth/sessions` | List active sessions | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | DELETE | `/api/v1/auth/sessions/:sessionId` | Revoke session | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/users` | List tenant users | `identity.user.view` | Tenant and branch scoped administration surface | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/users/:id` | Get tenant user membership details | `identity.user.view` | id is the tenant membership identifier; tenant and branch scope enforced | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/users` | Create tenant user membership | `identity.user.manage` | Password policy, branch validation, role validation and audit required | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | PATCH | `/api/v1/users/:id` | Change tenant user account status | `identity.user.manage` | Status command-style update; creates audit event | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/roles` | List tenant roles and permission assignments | `identity.role.manage` | Tenant scoped RBAC matrix source | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/roles` | Create tenant role | `identity.role.manage` | Role permission keys must exist in canonical catalog; audit required | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | PATCH | `/api/v1/roles/:id` | Update tenant role administration fields | `identity.role.manage` | MFA requirement is audited; permissions use explicit permissions command | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | PUT | `/api/v1/roles/:id/permissions` | Replace tenant role permissions | `identity.role.manage` | Explicit RBAC matrix command; creates audit event | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | POST | `/api/v1/users/roles` | Assign role to tenant user membership | `identity.role.manage` | Role and membership must belong to active tenant; audit required | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Identity | GET | `/api/v1/permissions` | List canonical permission catalog | `identity.role.manage` | Backed by shared permission keys and seeded Permission table | Core §11 + Appendix G frontend completion | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/products` | List products | `product.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/products/:id` | Get product details | `product.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/products` | Create product | `product.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | PATCH | `/api/v1/products/:id` | Update editable fields | `product.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/warehouses` | List warehouses | `warehouse.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/warehouses/:id` | Get warehouse details | `warehouse.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/warehouses` | Create warehouse | `warehouse.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | PATCH | `/api/v1/warehouses/:id` | Update editable fields | `warehouse.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/inventory/stock` | Current stock balances | `inventory.view` | Warehouse/product filters | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/inventory/ledger` | Stock ledger | `inventory.view` | Immutable transaction history | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | GET | `/api/v1/inventory/serials/:serialNo` | Lookup serial number | `inventory.view` | Global tenant search | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/reservations` | Reserve stock | `inventory.reserve` | Project/BOM reference | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | DELETE | `/api/v1/inventory/reservations/:id` | Release reservation | `inventory.reserve` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/transfers` | Create transfer | `inventory.transfer` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/transfers/:id/dispatch` | Dispatch transfer | `inventory.transfer` | Atomic source stock movement | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/transfers/:id/receive` | Receive transfer | `inventory.receive` | Atomic destination movement | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/adjustments` | Create adjustment | `inventory.adjust` | Approval threshold may apply | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Inventory | POST | `/api/v1/inventory/adjustments/:id/post` | Post adjustment | `inventory.adjust` | Creates immutable ledger | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Maintenance | GET | `/api/v1/maintenance/plans` | List maintenance plans | `maintenance.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Maintenance | POST | `/api/v1/maintenance/plans` | Create plan | `maintenance.create` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Maintenance | GET | `/api/v1/maintenance/schedule` | Upcoming maintenance | `maintenance.view` | Date/branch/site filters | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Maintenance | POST | `/api/v1/maintenance/schedules/:id/generate-work-order` | Generate work order | `maintenance.execute` | Idempotent | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Maintenance | POST | `/api/v1/maintenance/executions/:id/complete` | Complete maintenance | `maintenance.execute` | Updates next due date | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Notifications | GET | `/api/v1/notifications` | List notifications | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Notifications | POST | `/api/v1/notifications/:id/read` | Mark read | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Notifications | POST | `/api/v1/notifications/read-all` | Mark all read | `Authenticated` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | GET | `/api/v1/branches` | List branches | `branch.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | GET | `/api/v1/branches/:id` | Get branch details | `branch.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | POST | `/api/v1/branches` | Create branch | `branch.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | PATCH | `/api/v1/branches/:id` | Update editable fields | `branch.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | GET | `/api/v1/departments` | List departments | `department.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | GET | `/api/v1/departments/:id` | Get department details | `department.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | POST | `/api/v1/departments` | Create department | `department.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Organization | PATCH | `/api/v1/departments/:id` | Update editable fields | `department.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Platform | GET | `/api/v1/search` | Global search | `Authenticated` | Permission-filtered results | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Platform | GET | `/api/v1/calendar` | Unified calendar | `Authenticated` | Permission-filtered | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Platform | GET | `/api/v1/health/ready` | Readiness probe | `Internal/Public controlled` | No secrets | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Platform | GET | `/api/v1/health/live` | Liveness probe | `Internal/Public controlled` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/purchase-requests` | List purchase requests | `purchase_request.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-requests` | Create purchase request | `purchase_request.create` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/purchase-requests/:id` | Get purchase request | `purchase_request.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | PATCH | `/api/v1/purchase-requests/:id` | Edit draft request | `purchase_request.update` | DRAFT only | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-requests/:id/submit` | Submit for approval | `purchase_request.submit` | Creates approval workflow | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-requests/:id/approve` | Approve purchase request | `purchase_request.approve` | Explicit command | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-requests/:id/reject` | Reject purchase request | `purchase_request.approve` | Comment required | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-requests/:id/create-rfq` | Create RFQ | `rfq.create` | Requires approved PR | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/rfqs` | List RFQs | `rfq.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/rfqs` | Create RFQ | `rfq.create` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/rfqs/:id/invite-vendors` | Invite vendors | `rfq.update` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/rfqs/:id/publish` | Publish RFQ | `rfq.publish` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/rfqs/:id/close` | Close RFQ | `rfq.close` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/rfqs/:id/comparison` | Quotation comparison | `supplier_quotation.view` | Deterministic comparison view | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/supplier-quotations` | Record supplier quotation | `supplier_quotation.create` | Vendor portal/internal | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/supplier-quotations/:id/select` | Select quotation | `supplier_quotation.select` | Approval may be required | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/purchase-orders` | List purchase orders | `purchase_order.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-orders` | Create purchase order | `purchase_order.create` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-orders/:id/submit` | Submit PO approval | `purchase_order.submit` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-orders/:id/approve` | Approve PO | `purchase_order.approve` | Maker-checker | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-orders/:id/send` | Send PO to vendor | `purchase_order.send` | Queues document/email | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/purchase-orders/:id/cancel` | Cancel PO | `purchase_order.cancel` | Checks receipt state | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/goods-receipts` | List GRNs | `goods_receipt.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/goods-receipts` | Receive goods | `goods_receipt.create` | Atomic GRN + inventory transaction | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | GET | `/api/v1/goods-receipts/:id` | GRN details | `goods_receipt.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Procurement | POST | `/api/v1/goods-receipts/:id/inspect` | Record quality inspection | `goods_receipt.inspect` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects` | List projects | `project.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects/:id` | Get project details | `project.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/projects` | Create project | `project.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | PATCH | `/api/v1/projects/:id` | Update editable fields | `project.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/project-tasks` | List project tasks | `project_task.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/project-tasks/:id` | Get project task details | `project_task.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/project-tasks` | Create project task | `project_task.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | PATCH | `/api/v1/project-tasks/:id` | Update editable fields | `project_task.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects/:id/bom` | Project BOM | `project.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | PUT | `/api/v1/projects/:id/bom` | Create/update draft BOM | `project.update` | Versioned | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/projects/:id/bom/:bomId/approve` | Approve BOM | `project.approve` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects/:id/budget` | Project budget | `project.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | PUT | `/api/v1/projects/:id/budget` | Create/update draft project budget | `project.update` | Versioned budget lines | Pass 11 / Core Phase 5 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/projects/:id/budget/:budgetId/approve` | Approve project budget | `project.approve` | Supersedes prior approved budget | Pass 11 / Core Phase 5 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/projects/:id/material-request` | Create material requirement | `project.update` | Links procurement/inventory | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects/:id/costing` | Project cost and profitability | `project.view_financials` | Aggregated read model | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | POST | `/api/v1/projects/:id/handover` | Complete handover | `project.handover` | Customer acceptance evidence | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Projects | GET | `/api/v1/projects/:id/timeline` | Project activity timeline | `project.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/reports` | List reports | `report.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/reports/:id` | Get report details | `report.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Reports | POST | `/api/v1/reports/exports` | Request report export | `report.export` | Returns async job id | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/reports/exports/:jobId` | Check/download export | `report.export` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | GET | `/api/v1/tickets` | List tickets | `ticket.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | GET | `/api/v1/tickets/:id` | Get ticket details | `ticket.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/tickets` | Create ticket | `ticket.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | PATCH | `/api/v1/tickets/:id` | Update editable fields | `ticket.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | GET | `/api/v1/work-orders` | List work orders | `workorder.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | GET | `/api/v1/work-orders/:id` | Get workorder details | `workorder.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders` | Create workorder | `workorder.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | PATCH | `/api/v1/work-orders/:id` | Update editable fields | `workorder.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/tickets/:id/assign` | Assign ticket | `ticket.assign` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/tickets/:id/resolve` | Resolve ticket | `ticket.resolve` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/tickets/:id/close` | Close ticket | `ticket.close` | Customer confirmation rules | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/assign` | Assign technician | `workorder.assign` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/accept` | Technician accepts job | `workorder.accept` | Assigned technician only | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/start-travel` | Start travel | `workorder.update` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/arrive` | Mark onsite | `workorder.update` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/start` | Start work | `workorder.update` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/complete` | Complete work order | `workorder.close` | Requires service report | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/work-orders/:id/service-report` | Create service report | `workorder.update` | Parts consumption transaction | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | GET | `/api/v1/vendors` | List vendors | `vendor.view` | Paginated/filterable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | GET | `/api/v1/vendors/:id` | Get vendor details | `vendor.view` | Tenant scoped | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | POST | `/api/v1/vendors` | Create vendor | `vendor.create` | Validated shared contract | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | PATCH | `/api/v1/vendors/:id` | Update editable fields | `vendor.update` | Status is not freely patchable | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | GET | `/api/v1/vendors/:id/performance` | Vendor performance metrics | `vendor.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Vendors | GET | `/api/v1/vendors/:id/purchase-orders` | Vendor POs | `purchase_order.view` |  | Core §9 | IMPLEMENTED_STATIC_ONLY |
| Number Sequence | GET | `/api/v1/number-sequences` | List number sequence configuration | `` | Restricted platform/admin permission; issuing numbers is internal service logic | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Number Sequence | POST | `/api/v1/number-sequences` | Create number sequence configuration | `` | Restricted platform/admin permission | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Number Sequence | POST | `/api/v1/number-sequences/:id/reset` | Reset number sequence | `` | Restricted platform/admin permission | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Vendor Onboarding | POST | `/api/v1/vendor-onboarding/requests` | Create vendor onboarding request | `` | Approval/maker-checker applies | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Vendor Onboarding | POST | `/api/v1/vendor-onboarding/:id/submit` | Submit vendor onboarding | `` | Approval/maker-checker applies | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Vendor Onboarding | POST | `/api/v1/vendor-onboarding/:id/approve` | Approve vendor onboarding | `` | Approval/maker-checker applies | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Vendor Onboarding | POST | `/api/v1/vendors/:id/blacklist` | Blacklist vendor | `` | Approval/maker-checker applies | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | GET | `/api/v1/stock-counts` | List stock counts | `inventory.view` | Pass 08 read surface for stock count management; tenant/branch scoped | Appendix F.4 + Pass 08 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | GET | `/api/v1/stock-counts/:id` | Get stock count detail | `inventory.view` | Pass 08 detail surface for count status, lines and variances | Appendix F.4 + Pass 08 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | GET | `/api/v1/stock-counts/:id/count-sheet` | Get stock count sheet | `stock_count.manage` | Operational count sheet generated from frozen stock scope | Appendix F.4 + Pass 08 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | POST | `/api/v1/stock-counts` | Create stock count | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | POST | `/api/v1/stock-counts/:id/start` | Start stock count | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | POST | `/api/v1/stock-counts/:id/submit` | Submit stock count | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Stock Count | POST | `/api/v1/stock-counts/:id/post` | Post stock count variance | `` | Creates stock ledger entries | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Landed Cost | POST | `/api/v1/landed-costs` | Create landed cost | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Landed Cost | POST | `/api/v1/landed-costs/:id/allocate` | Allocate landed cost | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Landed Cost | POST | `/api/v1/landed-costs/:id/post` | Post landed cost | `` | Must be idempotent | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Tax Engine | GET | `/api/v1/tax-codes` | List tax codes | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Tax Engine | POST | `/api/v1/tax-rules` | Create tax rule | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Tax Engine | POST | `/api/v1/tax/calculate` | Deterministic tax preview | `` | Before invoice posting | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Tax Engine | GET | `/api/v1/tax/reports` | Tax reports | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Bank & Cash | GET | `/api/v1/bank-accounts` | List bank accounts | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Bank & Cash | POST | `/api/v1/bank-statements/import` | Import bank statement | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Bank & Cash | POST | `/api/v1/bank-reconciliations/:id/close` | Close reconciliation | `` | Creates audit and optional journal links | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Bank & Cash | POST | `/api/v1/vouchers/payment` | Create payment voucher | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Bank & Cash | POST | `/api/v1/vouchers/receipt` | Create receipt voucher | `` | Posts bank/cash collection journal with payer traceability | Appendix F.4 + Pass 15 completion | IMPLEMENTED_STATIC_ONLY |
| Purchase Contracts | POST | `/api/v1/purchase-contracts` | Create purchase contract | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Purchase Contracts | POST | `/api/v1/purchase-contracts/:id/approve` | Approve purchase contract | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Purchase Contracts | POST | `/api/v1/purchase-contracts/:id/create-release-order` | Create release order | `` | Validates remaining contract quantity/value | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Data Import | POST | `/api/v1/imports/upload` | Upload import batch | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Data Import | POST | `/api/v1/imports/:id/validate` | Validate import batch | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Data Import | POST | `/api/v1/imports/:id/commit` | Commit import batch | `` | Transactional by batch or controlled chunk | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Data Import | POST | `/api/v1/imports/:id/rollback` | Rollback import batch | `` | Rollback policy required | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Communication Log | GET | `/api/v1/communications` | List communications | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Communication Log | POST | `/api/v1/communications/send` | Send communication | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Communication Log | GET | `/api/v1/communications/:id/delivery` | Get delivery status | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Technician Visit | POST | `/api/v1/work-orders/:id/check-in` | Technician check-in | `` | Technician-only scope; privacy policy enforced | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Technician Visit | POST | `/api/v1/work-orders/:id/location` | Record technician location | `` | Technician-only scope; privacy policy enforced | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Technician Visit | POST | `/api/v1/work-orders/:id/check-out` | Technician check-out | `` | Technician-only scope; privacy policy enforced | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Report Builder | POST | `/api/v1/report-templates` | Create report template | `` | Saved reports retain permission scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Report Builder | POST | `/api/v1/saved-reports` | Create saved report | `` | Saved reports retain permission scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Report Builder | POST | `/api/v1/scheduled-reports` | Create scheduled report | `` | Saved reports retain permission scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Report Builder | GET | `/api/v1/report-executions/:id` | Get report execution | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Feature Flags | GET | `/api/v1/features` | List features | `` |  | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Feature Flags | POST | `/api/v1/organization-features` | Set organization features | `` | Per-tenant module enablement | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Feature Flags | PATCH | `/api/v1/module-configurations/:id` | Update module configuration | `` | Per-tenant/beta rollout | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | GET | `/api/v1/saas/plans` | List SaaS plans | `` | Platform owner scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | POST | `/api/v1/saas/subscriptions` | Create SaaS subscription | `` | Platform owner scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | GET | `/api/v1/saas/usage` | Get tenant usage | `` | Platform owner scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | POST | `/api/v1/saas/invoices/:id/post` | Post SaaS invoice | `` | Platform owner scope | Appendix F.4 | IMPLEMENTED_STATIC_ONLY |
| Service | POST | `/api/v1/portal/technician/offline-sync` | Synchronize technician PWA offline work-order commands, evidence references, checklist updates, status updates, service-report data and parts usage | `` | Authenticated technician portal scope; assigned technician only; tenant and branch enforced; idempotent by deviceId and clientCommandId. | Appendix G.11 | IMPLEMENTED_STATIC_ONLY |
| Integrations | GET | `/api/v1/integration-webhooks` | List integration webhooks | `integration.webhook.view` | Tenant-scoped webhook registry | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | GET | `/api/v1/integration-webhooks/:id` | Get integration webhook details | `integration.webhook.view` | Tenant scoped; raw target URL not exposed | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | POST | `/api/v1/integration-webhooks` | Create integration webhook | `integration.webhook.manage` | Requires HTTPS target and tenant connection | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | PATCH | `/api/v1/integration-webhooks/:id` | Update integration webhook | `integration.webhook.manage` | Audited config change; hashes target URL | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | POST | `/api/v1/integration-webhooks/:id/activate` | Activate integration webhook | `integration.webhook.manage` | Audited state change | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | POST | `/api/v1/integration-webhooks/:id/deactivate` | Deactivate integration webhook | `integration.webhook.manage` | Audited state change | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | GET | `/api/v1/integration-webhook-deliveries` | List webhook delivery attempts | `integration.webhook.view` | Tenant-scoped delivery evidence | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Integrations | POST | `/api/v1/integration-webhooks/:id/test-delivery` | Queue webhook test delivery | `integration.webhook.manage` | Creates delivery record and business event after validation | Pass 17 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/report-templates` | List report templates | `report.view` | Tenant scoped and permission scoped | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/report-templates/:id` | Report template detail | `report.view` | Source permission scope enforced | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | PATCH | `/api/v1/report-templates/:id` | Update report template | `report_builder.manage` | Field allowlist and audit enforced | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/saved-reports` | List saved reports | `report.view` | Owner and source permission scoped | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/saved-reports/:id` | Saved report detail | `report.view` | Cannot weaken source permissions | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | PATCH | `/api/v1/saved-reports/:id` | Update saved report | `report_builder.manage` | Selected fields remain allowlisted | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/scheduled-reports` | List scheduled reports | `report.view` | Auditable schedule listing | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/scheduled-reports/:id` | Scheduled report detail | `report.view` | Permission scope inherited from saved report | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | PATCH | `/api/v1/scheduled-reports/:id` | Update scheduled report | `report_builder.manage` | Recipient safety and audit enforced | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/report-executions` | List report executions | `report.view` | Report export evidence and worker status | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/dashboards/widgets` | List dashboard widgets | `report.view` | Role dashboard widget read model | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | POST | `/api/v1/dashboards/widgets` | Create dashboard widget | `report_builder.manage` | Permission scoped widget configuration | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/saved-views` | List saved grid views | `report.view` | Current user and permission scoped | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | GET | `/api/v1/saved-views/:id` | Saved view detail | `report.view` | Current user scope enforced | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | POST | `/api/v1/saved-views` | Create saved grid view | `report_builder.manage` | Columns filters and sort preserved | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Reports | PATCH | `/api/v1/saved-views/:id` | Update saved grid view | `report_builder.manage` | RBAC and audit enforced | Pass 19 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/dashboard` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/projects` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/contracts` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/sites` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/assets` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/tickets` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/invoices` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/payments` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/customer/documents` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/customer/work-orders/:id/confirm` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/dashboard` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/rfqs` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/quotations` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/purchase-orders` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/deliveries` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/invoices` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/payments` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/performance` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/vendor/documents` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/vendor/purchase-orders/:id/acknowledge` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/technician/dashboard` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/technician/jobs` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/technician/work-orders/:id` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/portal/technician/offline-queue` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/accept` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/start-travel` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/arrive` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/check-in` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/location` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/service-report` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/check-out` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/portal/technician/work-orders/:id/complete` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/saas/plans/:id` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/saas/subscriptions/:id` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | GET | `/api/v1/saas/usage/:id` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Pass 20 | POST | `/api/v1/saas/usage/collect` | Portal/SaaS readiness endpoint | `saas.manage` | Tenant, linked-record, plan-limit or assigned-technician scope enforced. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Customer Portal | POST | `/api/v1/portal/customer/tickets` | Create customer portal ticket | `ticket.create` | Creates ticket only for linked customer and audits portal action. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Vendor Portal | POST | `/api/v1/portal/vendor/quotations` | Submit vendor quotation | `supplier_quotation.create` | Vendor can submit quotation only for linked vendor RFQ invitation. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Vendor Portal | POST | `/api/v1/portal/vendor/invoices` | Submit vendor invoice | `supplier_invoice.create` | Vendor invoice is linked to vendor, PO/GRN and three-way match flow. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| Technician PWA | POST | `/api/v1/portal/technician/work-orders/:id/start` | Technician work-order start command | `workorder.update` | Assigned technician only; evidence uses Document IDs and audit trail. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | POST | `/api/v1/saas/plans` | Create SaaS plan | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | PATCH | `/api/v1/saas/plans/:id` | Update SaaS plan | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | GET | `/api/v1/saas/subscriptions` | List SaaS subscriptions | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | PATCH | `/api/v1/saas/subscriptions/:id` | Update SaaS subscription | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | GET | `/api/v1/saas/invoices` | List SaaS invoices | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | POST | `/api/v1/saas/invoices` | Create SaaS invoice | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | GET | `/api/v1/saas/invoices/:id` | SaaS invoice detail | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
| SaaS Billing | PATCH | `/api/v1/saas/invoices/:id` | Update SaaS invoice | `saas.manage` | Platform owner/admin only; plan limits, usage and billing are audit controlled. | Pass 20 | IMPLEMENTED_STATIC_ONLY |
