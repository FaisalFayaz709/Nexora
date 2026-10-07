export type LockedHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LockedEndpointDefinition {
  readonly area: string;
  readonly method: LockedHttpMethod;
  readonly endpoint: string;
  readonly purpose: string;
  readonly permission: string;
  readonly notes: string;
  readonly source: string;
}

export const LOCKED_ENDPOINTS = [
  {
    "area": "Approvals",
    "method": "GET",
    "endpoint": "/api/v1/approvals/inbox",
    "purpose": "Current approver inbox",
    "permission": "approval.view",
    "notes": "Resolved by role/user scope",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "GET",
    "endpoint": "/api/v1/approvals/:id",
    "purpose": "Approval request details",
    "permission": "approval.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/approvals/:id/approve",
    "purpose": "Approve current step",
    "permission": "approval.act",
    "notes": "Maker-checker enforced",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/approvals/:id/reject",
    "purpose": "Reject current step",
    "permission": "approval.act",
    "notes": "Comment required",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/approvals/:id/return",
    "purpose": "Return for correction",
    "permission": "approval.act",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "GET",
    "endpoint": "/api/v1/approval-definitions",
    "purpose": "List workflow definitions",
    "permission": "workflow.manage",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/approval-definitions",
    "purpose": "Create definition",
    "permission": "workflow.manage",
    "notes": "Configurable conditions/steps",
    "source": "Core \u00a79"
  },
  {
    "area": "Approvals",
    "method": "GET",
    "endpoint": "/api/v1/workflow-rules",
    "purpose": "List workflow/fraud control rules",
    "permission": "workflow.manage",
    "notes": "Tenant-scoped deterministic rule registry",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "GET",
    "endpoint": "/api/v1/workflow-rules/:id",
    "purpose": "Workflow/fraud control rule details",
    "permission": "workflow.manage",
    "notes": "Tenant scoped",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/workflow-rules",
    "purpose": "Create workflow/fraud control rule",
    "permission": "workflow.manage",
    "notes": "Validates governed subject, conditions and actions",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "PATCH",
    "endpoint": "/api/v1/workflow-rules/:id",
    "purpose": "Update workflow/fraud control rule",
    "permission": "workflow.manage",
    "notes": "Audited configuration change",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/workflow-rules/:id/activate",
    "purpose": "Activate workflow/fraud control rule",
    "permission": "workflow.manage",
    "notes": "Audited state change",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/workflow-rules/:id/deactivate",
    "purpose": "Deactivate workflow/fraud control rule",
    "permission": "workflow.manage",
    "notes": "Audited state change",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Approvals",
    "method": "POST",
    "endpoint": "/api/v1/workflow-rules/evaluate",
    "purpose": "Evaluate deterministic workflow/fraud controls",
    "permission": "workflow.manage",
    "notes": "Preview/block/approval decision; no frontend-only enforcement",
    "source": "Appendix F / Pass 16"
  },
  {
    "area": "Assets",
    "method": "GET",
    "endpoint": "/api/v1/assets",
    "purpose": "List assets",
    "permission": "asset.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "GET",
    "endpoint": "/api/v1/assets/:id",
    "purpose": "Get asset details",
    "permission": "asset.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets",
    "purpose": "Create asset",
    "permission": "asset.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "PATCH",
    "endpoint": "/api/v1/assets/:id",
    "purpose": "Update editable fields",
    "permission": "asset.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/register-from-stock",
    "purpose": "Register asset from serial/stock",
    "permission": "asset.create",
    "notes": "Requires eligible serial",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/:id/install",
    "purpose": "Install asset",
    "permission": "asset.install",
    "notes": "Atomic stock/asset history",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/:id/replace",
    "purpose": "Replace asset",
    "permission": "asset.replace",
    "notes": "Links old/new assets",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/:id/retire",
    "purpose": "Retire asset",
    "permission": "asset.retire",
    "notes": "Approval may apply",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "GET",
    "endpoint": "/api/v1/assets/:id/history",
    "purpose": "Asset lifecycle history",
    "permission": "asset.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/:id/qr/rotate",
    "purpose": "Rotate QR token",
    "permission": "asset.manage_qr",
    "notes": "Revokes prior token",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "GET",
    "endpoint": "/api/v1/asset-qr/:token",
    "purpose": "Resolve QR to authorized asset view",
    "permission": "Authenticated/portal",
    "notes": "Token alone does not bypass authorization",
    "source": "Core \u00a79"
  },
  {
    "area": "Assets",
    "method": "POST",
    "endpoint": "/api/v1/assets/:id/rma",
    "purpose": "Create RMA",
    "permission": "asset.rma",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Audit",
    "method": "GET",
    "endpoint": "/api/v1/audit-logs",
    "purpose": "Search audit trail",
    "permission": "audit.view",
    "notes": "Sensitive permission",
    "source": "Core \u00a79"
  },
  {
    "area": "Audit",
    "method": "GET",
    "endpoint": "/api/v1/audit-logs/:id",
    "purpose": "Audit event details",
    "permission": "audit.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/leads",
    "purpose": "List leads",
    "permission": "lead.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/leads/:id",
    "purpose": "Get lead details",
    "permission": "lead.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/leads",
    "purpose": "Create lead",
    "permission": "lead.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "PATCH",
    "endpoint": "/api/v1/leads/:id",
    "purpose": "Update editable fields",
    "permission": "lead.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/opportunities",
    "purpose": "List opportunities",
    "permission": "opportunity.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/opportunities/:id",
    "purpose": "Get opportunity details",
    "permission": "opportunity.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/opportunities",
    "purpose": "Create opportunity",
    "permission": "opportunity.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "PATCH",
    "endpoint": "/api/v1/opportunities/:id",
    "purpose": "Update editable fields",
    "permission": "opportunity.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/site-surveys",
    "purpose": "List site surveys",
    "permission": "site_survey.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/site-surveys/:id",
    "purpose": "Get site survey details",
    "permission": "site_survey.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/site-surveys",
    "purpose": "Create site survey",
    "permission": "site_survey.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "PATCH",
    "endpoint": "/api/v1/site-surveys/:id",
    "purpose": "Update editable fields",
    "permission": "site_survey.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/quotations",
    "purpose": "List quotations",
    "permission": "quotation.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/quotations/:id",
    "purpose": "Get quotation details",
    "permission": "quotation.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/quotations",
    "purpose": "Create quotation",
    "permission": "quotation.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "PATCH",
    "endpoint": "/api/v1/quotations/:id",
    "purpose": "Update editable fields",
    "permission": "quotation.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/contracts",
    "purpose": "List contracts",
    "permission": "contract.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "GET",
    "endpoint": "/api/v1/contracts/:id",
    "purpose": "Get contract details",
    "permission": "contract.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/contracts",
    "purpose": "Create contract",
    "permission": "contract.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "PATCH",
    "endpoint": "/api/v1/contracts/:id",
    "purpose": "Update editable fields",
    "permission": "contract.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/leads/:id/qualify",
    "purpose": "Qualify lead",
    "permission": "lead.update",
    "notes": "May create opportunity",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/quotations/:id/send",
    "purpose": "Mark/send quotation",
    "permission": "quotation.send",
    "notes": "Queues PDF/email",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/quotations/:id/accept",
    "purpose": "Accept quotation",
    "permission": "quotation.approve",
    "notes": "May create sales order",
    "source": "Core \u00a79"
  },
  {
    "area": "CRM",
    "method": "POST",
    "endpoint": "/api/v1/contracts/:id/activate",
    "purpose": "Activate contract",
    "permission": "contract.activate",
    "notes": "Validates dates/terms",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customers",
    "purpose": "List customers",
    "permission": "customer.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customers/:id",
    "purpose": "Get customer details",
    "permission": "customer.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "POST",
    "endpoint": "/api/v1/customers",
    "purpose": "Create customer",
    "permission": "customer.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "PATCH",
    "endpoint": "/api/v1/customers/:id",
    "purpose": "Update editable fields",
    "permission": "customer.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customer-sites",
    "purpose": "List customer sites",
    "permission": "customer_site.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customer-sites/:id",
    "purpose": "Get customer site details",
    "permission": "customer_site.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "POST",
    "endpoint": "/api/v1/customer-sites",
    "purpose": "Create customer site",
    "permission": "customer_site.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "PATCH",
    "endpoint": "/api/v1/customer-sites/:id",
    "purpose": "Update editable fields",
    "permission": "customer_site.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customers/:id/timeline",
    "purpose": "Customer activity timeline",
    "permission": "customer.view",
    "notes": "Aggregated read model",
    "source": "Core \u00a79"
  },
  {
    "area": "Customers",
    "method": "GET",
    "endpoint": "/api/v1/customer-sites/:id/assets",
    "purpose": "List assets at site",
    "permission": "asset.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "GET",
    "endpoint": "/api/v1/documents",
    "purpose": "List documents",
    "permission": "document.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "GET",
    "endpoint": "/api/v1/documents/:id",
    "purpose": "Get document details",
    "permission": "document.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "POST",
    "endpoint": "/api/v1/documents",
    "purpose": "Create document",
    "permission": "document.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "DELETE",
    "endpoint": "/api/v1/documents/:id",
    "purpose": "Delete/archive resource",
    "permission": "document.delete",
    "notes": "Subject to retention rules",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "POST",
    "endpoint": "/api/v1/documents/upload-intent",
    "purpose": "Request presigned upload",
    "permission": "document.create",
    "notes": "Validates size/type/category",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "POST",
    "endpoint": "/api/v1/documents/complete-upload",
    "purpose": "Register completed upload",
    "permission": "document.create",
    "notes": "Checksum/object existence check",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "GET",
    "endpoint": "/api/v1/documents/:id/download-url",
    "purpose": "Get presigned download URL",
    "permission": "document.view",
    "notes": "Short-lived and authorized",
    "source": "Core \u00a79"
  },
  {
    "area": "Documents",
    "method": "POST",
    "endpoint": "/api/v1/documents/:id/versions",
    "purpose": "Upload new version",
    "permission": "document.update",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/customer-invoices",
    "purpose": "List customer invoices",
    "permission": "invoice.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/customer-invoices/:id",
    "purpose": "Get invoice details",
    "permission": "invoice.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices",
    "purpose": "Create invoice",
    "permission": "invoice.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "PATCH",
    "endpoint": "/api/v1/customer-invoices/:id",
    "purpose": "Update editable fields",
    "permission": "invoice.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/supplier-invoices",
    "purpose": "List supplier invoices",
    "permission": "supplier_invoice.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/supplier-invoices/:id",
    "purpose": "Get supplier invoice details",
    "permission": "supplier_invoice.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/supplier-invoices",
    "purpose": "Create supplier invoice",
    "permission": "supplier_invoice.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "PATCH",
    "endpoint": "/api/v1/supplier-invoices/:id",
    "purpose": "Update editable fields",
    "permission": "supplier_invoice.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/expenses",
    "purpose": "List expenses",
    "permission": "expense.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/expenses/:id",
    "purpose": "Get expense details",
    "permission": "expense.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/expenses",
    "purpose": "Create expense",
    "permission": "expense.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "PATCH",
    "endpoint": "/api/v1/expenses/:id",
    "purpose": "Update editable fields",
    "permission": "expense.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices/:id/submit",
    "purpose": "Submit invoice approval",
    "permission": "invoice.submit",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices/:id/approve",
    "purpose": "Approve invoice",
    "permission": "invoice.approve",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices/:id/post",
    "purpose": "Post invoice",
    "permission": "invoice.post",
    "notes": "May create journal entry",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices/:id/send",
    "purpose": "Send invoice",
    "permission": "invoice.send",
    "notes": "PDF/email job",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/customer-invoices/:id/cancel",
    "purpose": "Cancel/reverse invoice",
    "permission": "invoice.cancel",
    "notes": "No destructive delete after posting",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/supplier-invoices/:id/match",
    "purpose": "Run three-way match",
    "permission": "supplier_invoice.match",
    "notes": "PO + GRN + invoice",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/supplier-invoices/:id/approve",
    "purpose": "Approve supplier invoice",
    "permission": "supplier_invoice.approve",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/payments",
    "purpose": "List payments",
    "permission": "payment.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/payments",
    "purpose": "Record payment",
    "permission": "payment.create",
    "notes": "Idempotency key; allocations transactional",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/accounts",
    "purpose": "Chart of accounts",
    "permission": "account.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/journal-entries",
    "purpose": "Create manual journal",
    "permission": "journal.create",
    "notes": "Restricted",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "POST",
    "endpoint": "/api/v1/journal-entries/:id/post",
    "purpose": "Post journal",
    "permission": "journal.post",
    "notes": "Immutable after posting; reverse instead",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/finance/receivables",
    "purpose": "AR aging",
    "permission": "finance.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Finance",
    "method": "GET",
    "endpoint": "/api/v1/finance/payables",
    "purpose": "AP aging",
    "permission": "finance.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/employees",
    "purpose": "List employees",
    "permission": "employee.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/employees/:id",
    "purpose": "Get employee details",
    "permission": "employee.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/employees",
    "purpose": "Create employee",
    "permission": "employee.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "PATCH",
    "endpoint": "/api/v1/employees/:id",
    "purpose": "Update editable fields",
    "permission": "employee.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/attendance",
    "purpose": "List attendance",
    "permission": "attendance.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/attendance/:id",
    "purpose": "Get attendance details",
    "permission": "attendance.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/leave-requests",
    "purpose": "List leave requests",
    "permission": "leave.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/leave-requests/:id",
    "purpose": "Get leave details",
    "permission": "leave.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/leave-requests",
    "purpose": "Create leave",
    "permission": "leave.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/payroll-runs",
    "purpose": "List payroll runs",
    "permission": "payroll.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "GET",
    "endpoint": "/api/v1/payroll-runs/:id",
    "purpose": "Get payroll details",
    "permission": "payroll.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/payroll-runs",
    "purpose": "Create payroll",
    "permission": "payroll.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/leave-requests/:id/submit",
    "purpose": "Submit leave request",
    "permission": "leave.submit",
    "notes": "Creates approval request when required",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/leave-requests/:id/cancel",
    "purpose": "Cancel leave request",
    "permission": "leave.cancel",
    "notes": "State transition",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/payroll-runs/:id/calculate",
    "purpose": "Calculate payroll",
    "permission": "payroll.calculate",
    "notes": "Background-capable",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/payroll-runs/:id/approve",
    "purpose": "Approve payroll",
    "permission": "payroll.approve",
    "notes": "Maker-checker",
    "source": "Core \u00a79"
  },
  {
    "area": "HR",
    "method": "POST",
    "endpoint": "/api/v1/payroll-runs/:id/post",
    "purpose": "Post payroll",
    "permission": "payroll.post",
    "notes": "Transactional finance integration",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/auth/login",
    "purpose": "Authenticate user",
    "permission": "Public",
    "notes": "Rate limited; may return MFA challenge",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/auth/mfa/verify",
    "purpose": "Complete MFA challenge",
    "permission": "Public/Challenge",
    "notes": "Rate limited",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/auth/refresh",
    "purpose": "Rotate access session",
    "permission": "Session cookie",
    "notes": "Refresh token/session rotation",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/auth/logout",
    "purpose": "Revoke current session",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/auth/logout-all",
    "purpose": "Revoke all sessions",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/auth/me",
    "purpose": "Current user/membership/permissions",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/auth/sessions",
    "purpose": "List active sessions",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "DELETE",
    "endpoint": "/api/v1/auth/sessions/:sessionId",
    "purpose": "Revoke session",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/users",
    "purpose": "List tenant users",
    "permission": "identity.user.view",
    "notes": "Tenant and branch scoped administration surface",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/users/:id",
    "purpose": "Get tenant user membership details",
    "permission": "identity.user.view",
    "notes": "id is the tenant membership identifier; tenant and branch scope enforced",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/users",
    "purpose": "Create tenant user membership",
    "permission": "identity.user.manage",
    "notes": "Password policy, branch validation, role validation and audit required",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "PATCH",
    "endpoint": "/api/v1/users/:id",
    "purpose": "Change tenant user account status",
    "permission": "identity.user.manage",
    "notes": "Status command-style update; creates audit event",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/roles",
    "purpose": "List tenant roles and permission assignments",
    "permission": "identity.role.manage",
    "notes": "Tenant scoped RBAC matrix source",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/roles",
    "purpose": "Create tenant role",
    "permission": "identity.role.manage",
    "notes": "Role permission keys must exist in canonical catalog; audit required",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "PATCH",
    "endpoint": "/api/v1/roles/:id",
    "purpose": "Update tenant role administration fields",
    "permission": "identity.role.manage",
    "notes": "MFA requirement is audited; permissions use explicit permissions command",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "PUT",
    "endpoint": "/api/v1/roles/:id/permissions",
    "purpose": "Replace tenant role permissions",
    "permission": "identity.role.manage",
    "notes": "Explicit RBAC matrix command; creates audit event",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "POST",
    "endpoint": "/api/v1/users/roles",
    "purpose": "Assign role to tenant user membership",
    "permission": "identity.role.manage",
    "notes": "Role and membership must belong to active tenant; audit required",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Identity",
    "method": "GET",
    "endpoint": "/api/v1/permissions",
    "purpose": "List canonical permission catalog",
    "permission": "identity.role.manage",
    "notes": "Backed by shared permission keys and seeded Permission table",
    "source": "Core \u00a711 + Appendix G frontend completion"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/products",
    "purpose": "List products",
    "permission": "product.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/products/:id",
    "purpose": "Get product details",
    "permission": "product.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/products",
    "purpose": "Create product",
    "permission": "product.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "PATCH",
    "endpoint": "/api/v1/products/:id",
    "purpose": "Update editable fields",
    "permission": "product.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/warehouses",
    "purpose": "List warehouses",
    "permission": "warehouse.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/warehouses/:id",
    "purpose": "Get warehouse details",
    "permission": "warehouse.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/warehouses",
    "purpose": "Create warehouse",
    "permission": "warehouse.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "PATCH",
    "endpoint": "/api/v1/warehouses/:id",
    "purpose": "Update editable fields",
    "permission": "warehouse.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/inventory/stock",
    "purpose": "Current stock balances",
    "permission": "inventory.view",
    "notes": "Warehouse/product filters",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/inventory/ledger",
    "purpose": "Stock ledger",
    "permission": "inventory.view",
    "notes": "Immutable transaction history",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "GET",
    "endpoint": "/api/v1/inventory/serials/:serialNo",
    "purpose": "Lookup serial number",
    "permission": "inventory.view",
    "notes": "Global tenant search",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/reservations",
    "purpose": "Reserve stock",
    "permission": "inventory.reserve",
    "notes": "Project/BOM reference",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "DELETE",
    "endpoint": "/api/v1/inventory/reservations/:id",
    "purpose": "Release reservation",
    "permission": "inventory.reserve",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/transfers",
    "purpose": "Create transfer",
    "permission": "inventory.transfer",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/transfers/:id/dispatch",
    "purpose": "Dispatch transfer",
    "permission": "inventory.transfer",
    "notes": "Atomic source stock movement",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/transfers/:id/receive",
    "purpose": "Receive transfer",
    "permission": "inventory.receive",
    "notes": "Atomic destination movement",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/adjustments",
    "purpose": "Create adjustment",
    "permission": "inventory.adjust",
    "notes": "Approval threshold may apply",
    "source": "Core \u00a79"
  },
  {
    "area": "Inventory",
    "method": "POST",
    "endpoint": "/api/v1/inventory/adjustments/:id/post",
    "purpose": "Post adjustment",
    "permission": "inventory.adjust",
    "notes": "Creates immutable ledger",
    "source": "Core \u00a79"
  },
  {
    "area": "Maintenance",
    "method": "GET",
    "endpoint": "/api/v1/maintenance/plans",
    "purpose": "List maintenance plans",
    "permission": "maintenance.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Maintenance",
    "method": "POST",
    "endpoint": "/api/v1/maintenance/plans",
    "purpose": "Create plan",
    "permission": "maintenance.create",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Maintenance",
    "method": "GET",
    "endpoint": "/api/v1/maintenance/schedule",
    "purpose": "Upcoming maintenance",
    "permission": "maintenance.view",
    "notes": "Date/branch/site filters",
    "source": "Core \u00a79"
  },
  {
    "area": "Maintenance",
    "method": "POST",
    "endpoint": "/api/v1/maintenance/schedules/:id/generate-work-order",
    "purpose": "Generate work order",
    "permission": "maintenance.execute",
    "notes": "Idempotent",
    "source": "Core \u00a79"
  },
  {
    "area": "Maintenance",
    "method": "POST",
    "endpoint": "/api/v1/maintenance/executions/:id/complete",
    "purpose": "Complete maintenance",
    "permission": "maintenance.execute",
    "notes": "Updates next due date",
    "source": "Core \u00a79"
  },
  {
    "area": "Notifications",
    "method": "GET",
    "endpoint": "/api/v1/notifications",
    "purpose": "List notifications",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Notifications",
    "method": "POST",
    "endpoint": "/api/v1/notifications/:id/read",
    "purpose": "Mark read",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Notifications",
    "method": "POST",
    "endpoint": "/api/v1/notifications/read-all",
    "purpose": "Mark all read",
    "permission": "Authenticated",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "GET",
    "endpoint": "/api/v1/branches",
    "purpose": "List branches",
    "permission": "branch.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "GET",
    "endpoint": "/api/v1/branches/:id",
    "purpose": "Get branch details",
    "permission": "branch.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "POST",
    "endpoint": "/api/v1/branches",
    "purpose": "Create branch",
    "permission": "branch.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "PATCH",
    "endpoint": "/api/v1/branches/:id",
    "purpose": "Update editable fields",
    "permission": "branch.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "GET",
    "endpoint": "/api/v1/departments",
    "purpose": "List departments",
    "permission": "department.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "GET",
    "endpoint": "/api/v1/departments/:id",
    "purpose": "Get department details",
    "permission": "department.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "POST",
    "endpoint": "/api/v1/departments",
    "purpose": "Create department",
    "permission": "department.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Organization",
    "method": "PATCH",
    "endpoint": "/api/v1/departments/:id",
    "purpose": "Update editable fields",
    "permission": "department.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Platform",
    "method": "GET",
    "endpoint": "/api/v1/search",
    "purpose": "Global search",
    "permission": "Authenticated",
    "notes": "Permission-filtered results",
    "source": "Core \u00a79"
  },
  {
    "area": "Platform",
    "method": "GET",
    "endpoint": "/api/v1/calendar",
    "purpose": "Unified calendar",
    "permission": "Authenticated",
    "notes": "Permission-filtered",
    "source": "Core \u00a79"
  },
  {
    "area": "Platform",
    "method": "GET",
    "endpoint": "/api/v1/health/ready",
    "purpose": "Readiness probe",
    "permission": "Internal/Public controlled",
    "notes": "No secrets",
    "source": "Core \u00a79"
  },
  {
    "area": "Platform",
    "method": "GET",
    "endpoint": "/api/v1/health/live",
    "purpose": "Liveness probe",
    "permission": "Internal/Public controlled",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/purchase-requests",
    "purpose": "List purchase requests",
    "permission": "purchase_request.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-requests",
    "purpose": "Create purchase request",
    "permission": "purchase_request.create",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/purchase-requests/:id",
    "purpose": "Get purchase request",
    "permission": "purchase_request.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "PATCH",
    "endpoint": "/api/v1/purchase-requests/:id",
    "purpose": "Edit draft request",
    "permission": "purchase_request.update",
    "notes": "DRAFT only",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-requests/:id/submit",
    "purpose": "Submit for approval",
    "permission": "purchase_request.submit",
    "notes": "Creates approval workflow",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-requests/:id/approve",
    "purpose": "Approve purchase request",
    "permission": "purchase_request.approve",
    "notes": "Explicit command",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-requests/:id/reject",
    "purpose": "Reject purchase request",
    "permission": "purchase_request.approve",
    "notes": "Comment required",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-requests/:id/create-rfq",
    "purpose": "Create RFQ",
    "permission": "rfq.create",
    "notes": "Requires approved PR",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/rfqs",
    "purpose": "List RFQs",
    "permission": "rfq.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/rfqs",
    "purpose": "Create RFQ",
    "permission": "rfq.create",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/rfqs/:id/invite-vendors",
    "purpose": "Invite vendors",
    "permission": "rfq.update",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/rfqs/:id/publish",
    "purpose": "Publish RFQ",
    "permission": "rfq.publish",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/rfqs/:id/close",
    "purpose": "Close RFQ",
    "permission": "rfq.close",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/rfqs/:id/comparison",
    "purpose": "Quotation comparison",
    "permission": "supplier_quotation.view",
    "notes": "Deterministic comparison view",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/supplier-quotations",
    "purpose": "Record supplier quotation",
    "permission": "supplier_quotation.create",
    "notes": "Vendor portal/internal",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/supplier-quotations/:id/select",
    "purpose": "Select quotation",
    "permission": "supplier_quotation.select",
    "notes": "Approval may be required",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/purchase-orders",
    "purpose": "List purchase orders",
    "permission": "purchase_order.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-orders",
    "purpose": "Create purchase order",
    "permission": "purchase_order.create",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-orders/:id/submit",
    "purpose": "Submit PO approval",
    "permission": "purchase_order.submit",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-orders/:id/approve",
    "purpose": "Approve PO",
    "permission": "purchase_order.approve",
    "notes": "Maker-checker",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-orders/:id/send",
    "purpose": "Send PO to vendor",
    "permission": "purchase_order.send",
    "notes": "Queues document/email",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/purchase-orders/:id/cancel",
    "purpose": "Cancel PO",
    "permission": "purchase_order.cancel",
    "notes": "Checks receipt state",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/goods-receipts",
    "purpose": "List GRNs",
    "permission": "goods_receipt.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/goods-receipts",
    "purpose": "Receive goods",
    "permission": "goods_receipt.create",
    "notes": "Atomic GRN + inventory transaction",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "GET",
    "endpoint": "/api/v1/goods-receipts/:id",
    "purpose": "GRN details",
    "permission": "goods_receipt.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Procurement",
    "method": "POST",
    "endpoint": "/api/v1/goods-receipts/:id/inspect",
    "purpose": "Record quality inspection",
    "permission": "goods_receipt.inspect",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects",
    "purpose": "List projects",
    "permission": "project.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects/:id",
    "purpose": "Get project details",
    "permission": "project.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/projects",
    "purpose": "Create project",
    "permission": "project.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "PATCH",
    "endpoint": "/api/v1/projects/:id",
    "purpose": "Update editable fields",
    "permission": "project.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/project-tasks",
    "purpose": "List project tasks",
    "permission": "project_task.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/project-tasks/:id",
    "purpose": "Get project task details",
    "permission": "project_task.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/project-tasks",
    "purpose": "Create project task",
    "permission": "project_task.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "PATCH",
    "endpoint": "/api/v1/project-tasks/:id",
    "purpose": "Update editable fields",
    "permission": "project_task.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects/:id/bom",
    "purpose": "Project BOM",
    "permission": "project.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "PUT",
    "endpoint": "/api/v1/projects/:id/bom",
    "purpose": "Create/update draft BOM",
    "permission": "project.update",
    "notes": "Versioned",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/projects/:id/bom/:bomId/approve",
    "purpose": "Approve BOM",
    "permission": "project.approve",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects/:id/budget",
    "purpose": "Project budget",
    "permission": "project.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "PUT",
    "endpoint": "/api/v1/projects/:id/budget",
    "purpose": "Create/update draft project budget",
    "permission": "project.update",
    "notes": "Versioned budget lines",
    "source": "Pass 11 / Core Phase 5"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/projects/:id/budget/:budgetId/approve",
    "purpose": "Approve project budget",
    "permission": "project.approve",
    "notes": "Supersedes prior approved budget",
    "source": "Pass 11 / Core Phase 5"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/projects/:id/material-request",
    "purpose": "Create material requirement",
    "permission": "project.update",
    "notes": "Links procurement/inventory",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects/:id/costing",
    "purpose": "Project cost and profitability",
    "permission": "project.view_financials",
    "notes": "Aggregated read model",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "POST",
    "endpoint": "/api/v1/projects/:id/handover",
    "purpose": "Complete handover",
    "permission": "project.handover",
    "notes": "Customer acceptance evidence",
    "source": "Core \u00a79"
  },
  {
    "area": "Projects",
    "method": "GET",
    "endpoint": "/api/v1/projects/:id/timeline",
    "purpose": "Project activity timeline",
    "permission": "project.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/reports",
    "purpose": "List reports",
    "permission": "report.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/reports/:id",
    "purpose": "Get report details",
    "permission": "report.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Reports",
    "method": "POST",
    "endpoint": "/api/v1/reports/exports",
    "purpose": "Request report export",
    "permission": "report.export",
    "notes": "Returns async job id",
    "source": "Core \u00a79"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/reports/exports/:jobId",
    "purpose": "Check/download export",
    "permission": "report.export",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "GET",
    "endpoint": "/api/v1/tickets",
    "purpose": "List tickets",
    "permission": "ticket.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "GET",
    "endpoint": "/api/v1/tickets/:id",
    "purpose": "Get ticket details",
    "permission": "ticket.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/tickets",
    "purpose": "Create ticket",
    "permission": "ticket.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "PATCH",
    "endpoint": "/api/v1/tickets/:id",
    "purpose": "Update editable fields",
    "permission": "ticket.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "GET",
    "endpoint": "/api/v1/work-orders",
    "purpose": "List work orders",
    "permission": "workorder.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "GET",
    "endpoint": "/api/v1/work-orders/:id",
    "purpose": "Get workorder details",
    "permission": "workorder.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders",
    "purpose": "Create workorder",
    "permission": "workorder.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "PATCH",
    "endpoint": "/api/v1/work-orders/:id",
    "purpose": "Update editable fields",
    "permission": "workorder.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/tickets/:id/assign",
    "purpose": "Assign ticket",
    "permission": "ticket.assign",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/tickets/:id/resolve",
    "purpose": "Resolve ticket",
    "permission": "ticket.resolve",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/tickets/:id/close",
    "purpose": "Close ticket",
    "permission": "ticket.close",
    "notes": "Customer confirmation rules",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/assign",
    "purpose": "Assign technician",
    "permission": "workorder.assign",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/accept",
    "purpose": "Technician accepts job",
    "permission": "workorder.accept",
    "notes": "Assigned technician only",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/start-travel",
    "purpose": "Start travel",
    "permission": "workorder.update",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/arrive",
    "purpose": "Mark onsite",
    "permission": "workorder.update",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/start",
    "purpose": "Start work",
    "permission": "workorder.update",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/complete",
    "purpose": "Complete work order",
    "permission": "workorder.close",
    "notes": "Requires service report",
    "source": "Core \u00a79"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/service-report",
    "purpose": "Create service report",
    "permission": "workorder.update",
    "notes": "Parts consumption transaction",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "GET",
    "endpoint": "/api/v1/vendors",
    "purpose": "List vendors",
    "permission": "vendor.view",
    "notes": "Paginated/filterable",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "GET",
    "endpoint": "/api/v1/vendors/:id",
    "purpose": "Get vendor details",
    "permission": "vendor.view",
    "notes": "Tenant scoped",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "POST",
    "endpoint": "/api/v1/vendors",
    "purpose": "Create vendor",
    "permission": "vendor.create",
    "notes": "Validated shared contract",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "PATCH",
    "endpoint": "/api/v1/vendors/:id",
    "purpose": "Update editable fields",
    "permission": "vendor.update",
    "notes": "Status is not freely patchable",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "GET",
    "endpoint": "/api/v1/vendors/:id/performance",
    "purpose": "Vendor performance metrics",
    "permission": "vendor.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Vendors",
    "method": "GET",
    "endpoint": "/api/v1/vendors/:id/purchase-orders",
    "purpose": "Vendor POs",
    "permission": "purchase_order.view",
    "notes": "",
    "source": "Core \u00a79"
  },
  {
    "area": "Number Sequence",
    "method": "GET",
    "endpoint": "/api/v1/number-sequences",
    "purpose": "List number sequence configuration",
    "permission": "",
    "notes": "Restricted platform/admin permission; issuing numbers is internal service logic",
    "source": "Appendix F.4"
  },
  {
    "area": "Number Sequence",
    "method": "POST",
    "endpoint": "/api/v1/number-sequences",
    "purpose": "Create number sequence configuration",
    "permission": "",
    "notes": "Restricted platform/admin permission",
    "source": "Appendix F.4"
  },
  {
    "area": "Number Sequence",
    "method": "POST",
    "endpoint": "/api/v1/number-sequences/:id/reset",
    "purpose": "Reset number sequence",
    "permission": "",
    "notes": "Restricted platform/admin permission",
    "source": "Appendix F.4"
  },
  {
    "area": "Vendor Onboarding",
    "method": "POST",
    "endpoint": "/api/v1/vendor-onboarding/requests",
    "purpose": "Create vendor onboarding request",
    "permission": "",
    "notes": "Approval/maker-checker applies",
    "source": "Appendix F.4"
  },
  {
    "area": "Vendor Onboarding",
    "method": "POST",
    "endpoint": "/api/v1/vendor-onboarding/:id/submit",
    "purpose": "Submit vendor onboarding",
    "permission": "",
    "notes": "Approval/maker-checker applies",
    "source": "Appendix F.4"
  },
  {
    "area": "Vendor Onboarding",
    "method": "POST",
    "endpoint": "/api/v1/vendor-onboarding/:id/approve",
    "purpose": "Approve vendor onboarding",
    "permission": "",
    "notes": "Approval/maker-checker applies",
    "source": "Appendix F.4"
  },
  {
    "area": "Vendor Onboarding",
    "method": "POST",
    "endpoint": "/api/v1/vendors/:id/blacklist",
    "purpose": "Blacklist vendor",
    "permission": "",
    "notes": "Approval/maker-checker applies",
    "source": "Appendix F.4"
  },
  {
    "area": "Stock Count",
    "method": "GET",
    "endpoint": "/api/v1/stock-counts",
    "purpose": "List stock counts",
    "permission": "inventory.view",
    "notes": "Pass 08 read surface for stock count management; tenant/branch scoped",
    "source": "Appendix F.4 + Pass 08"
  },
  {
    "area": "Stock Count",
    "method": "GET",
    "endpoint": "/api/v1/stock-counts/:id",
    "purpose": "Get stock count detail",
    "permission": "inventory.view",
    "notes": "Pass 08 detail surface for count status, lines and variances",
    "source": "Appendix F.4 + Pass 08"
  },
  {
    "area": "Stock Count",
    "method": "GET",
    "endpoint": "/api/v1/stock-counts/:id/count-sheet",
    "purpose": "Get stock count sheet",
    "permission": "stock_count.manage",
    "notes": "Operational count sheet generated from frozen stock scope",
    "source": "Appendix F.4 + Pass 08"
  },
  {
    "area": "Stock Count",
    "method": "POST",
    "endpoint": "/api/v1/stock-counts",
    "purpose": "Create stock count",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Stock Count",
    "method": "POST",
    "endpoint": "/api/v1/stock-counts/:id/start",
    "purpose": "Start stock count",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Stock Count",
    "method": "POST",
    "endpoint": "/api/v1/stock-counts/:id/submit",
    "purpose": "Submit stock count",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Stock Count",
    "method": "POST",
    "endpoint": "/api/v1/stock-counts/:id/post",
    "purpose": "Post stock count variance",
    "permission": "",
    "notes": "Creates stock ledger entries",
    "source": "Appendix F.4"
  },
  {
    "area": "Landed Cost",
    "method": "POST",
    "endpoint": "/api/v1/landed-costs",
    "purpose": "Create landed cost",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Landed Cost",
    "method": "POST",
    "endpoint": "/api/v1/landed-costs/:id/allocate",
    "purpose": "Allocate landed cost",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Landed Cost",
    "method": "POST",
    "endpoint": "/api/v1/landed-costs/:id/post",
    "purpose": "Post landed cost",
    "permission": "",
    "notes": "Must be idempotent",
    "source": "Appendix F.4"
  },
  {
    "area": "Tax Engine",
    "method": "GET",
    "endpoint": "/api/v1/tax-codes",
    "purpose": "List tax codes",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Tax Engine",
    "method": "POST",
    "endpoint": "/api/v1/tax-rules",
    "purpose": "Create tax rule",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Tax Engine",
    "method": "POST",
    "endpoint": "/api/v1/tax/calculate",
    "purpose": "Deterministic tax preview",
    "permission": "",
    "notes": "Before invoice posting",
    "source": "Appendix F.4"
  },
  {
    "area": "Tax Engine",
    "method": "GET",
    "endpoint": "/api/v1/tax/reports",
    "purpose": "Tax reports",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Bank & Cash",
    "method": "GET",
    "endpoint": "/api/v1/bank-accounts",
    "purpose": "List bank accounts",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Bank & Cash",
    "method": "POST",
    "endpoint": "/api/v1/bank-statements/import",
    "purpose": "Import bank statement",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Bank & Cash",
    "method": "POST",
    "endpoint": "/api/v1/bank-reconciliations/:id/close",
    "purpose": "Close reconciliation",
    "permission": "",
    "notes": "Creates audit and optional journal links",
    "source": "Appendix F.4"
  },
  {
    "area": "Bank & Cash",
    "method": "POST",
    "endpoint": "/api/v1/vouchers/payment",
    "purpose": "Create payment voucher",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Bank & Cash",
    "method": "POST",
    "endpoint": "/api/v1/vouchers/receipt",
    "purpose": "Create receipt voucher",
    "permission": "",
    "notes": "Posts bank/cash collection journal with payer traceability",
    "source": "Appendix F.4 + Pass 15 completion"
  },
  {
    "area": "Purchase Contracts",
    "method": "POST",
    "endpoint": "/api/v1/purchase-contracts",
    "purpose": "Create purchase contract",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Purchase Contracts",
    "method": "POST",
    "endpoint": "/api/v1/purchase-contracts/:id/approve",
    "purpose": "Approve purchase contract",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Purchase Contracts",
    "method": "POST",
    "endpoint": "/api/v1/purchase-contracts/:id/create-release-order",
    "purpose": "Create release order",
    "permission": "",
    "notes": "Validates remaining contract quantity/value",
    "source": "Appendix F.4"
  },
  {
    "area": "Data Import",
    "method": "POST",
    "endpoint": "/api/v1/imports/upload",
    "purpose": "Upload import batch",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Data Import",
    "method": "POST",
    "endpoint": "/api/v1/imports/:id/validate",
    "purpose": "Validate import batch",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Data Import",
    "method": "POST",
    "endpoint": "/api/v1/imports/:id/commit",
    "purpose": "Commit import batch",
    "permission": "",
    "notes": "Transactional by batch or controlled chunk",
    "source": "Appendix F.4"
  },
  {
    "area": "Data Import",
    "method": "POST",
    "endpoint": "/api/v1/imports/:id/rollback",
    "purpose": "Rollback import batch",
    "permission": "",
    "notes": "Rollback policy required",
    "source": "Appendix F.4"
  },
  {
    "area": "Communication Log",
    "method": "GET",
    "endpoint": "/api/v1/communications",
    "purpose": "List communications",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Communication Log",
    "method": "POST",
    "endpoint": "/api/v1/communications/send",
    "purpose": "Send communication",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Communication Log",
    "method": "GET",
    "endpoint": "/api/v1/communications/:id/delivery",
    "purpose": "Get delivery status",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Technician Visit",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/check-in",
    "purpose": "Technician check-in",
    "permission": "",
    "notes": "Technician-only scope; privacy policy enforced",
    "source": "Appendix F.4"
  },
  {
    "area": "Technician Visit",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/location",
    "purpose": "Record technician location",
    "permission": "",
    "notes": "Technician-only scope; privacy policy enforced",
    "source": "Appendix F.4"
  },
  {
    "area": "Technician Visit",
    "method": "POST",
    "endpoint": "/api/v1/work-orders/:id/check-out",
    "purpose": "Technician check-out",
    "permission": "",
    "notes": "Technician-only scope; privacy policy enforced",
    "source": "Appendix F.4"
  },
  {
    "area": "Report Builder",
    "method": "POST",
    "endpoint": "/api/v1/report-templates",
    "purpose": "Create report template",
    "permission": "",
    "notes": "Saved reports retain permission scope",
    "source": "Appendix F.4"
  },
  {
    "area": "Report Builder",
    "method": "POST",
    "endpoint": "/api/v1/saved-reports",
    "purpose": "Create saved report",
    "permission": "",
    "notes": "Saved reports retain permission scope",
    "source": "Appendix F.4"
  },
  {
    "area": "Report Builder",
    "method": "POST",
    "endpoint": "/api/v1/scheduled-reports",
    "purpose": "Create scheduled report",
    "permission": "",
    "notes": "Saved reports retain permission scope",
    "source": "Appendix F.4"
  },
  {
    "area": "Report Builder",
    "method": "GET",
    "endpoint": "/api/v1/report-executions/:id",
    "purpose": "Get report execution",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Feature Flags",
    "method": "GET",
    "endpoint": "/api/v1/features",
    "purpose": "List features",
    "permission": "",
    "notes": "",
    "source": "Appendix F.4"
  },
  {
    "area": "Feature Flags",
    "method": "POST",
    "endpoint": "/api/v1/organization-features",
    "purpose": "Set organization features",
    "permission": "",
    "notes": "Per-tenant module enablement",
    "source": "Appendix F.4"
  },
  {
    "area": "Feature Flags",
    "method": "PATCH",
    "endpoint": "/api/v1/module-configurations/:id",
    "purpose": "Update module configuration",
    "permission": "",
    "notes": "Per-tenant/beta rollout",
    "source": "Appendix F.4"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/plans",
    "purpose": "List SaaS plans",
    "permission": "",
    "notes": "Platform owner scope",
    "source": "Appendix F.4"
  },
  {
    "area": "SaaS Billing",
    "method": "POST",
    "endpoint": "/api/v1/saas/subscriptions",
    "purpose": "Create SaaS subscription",
    "permission": "",
    "notes": "Platform owner scope",
    "source": "Appendix F.4"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/usage",
    "purpose": "Get tenant usage",
    "permission": "",
    "notes": "Platform owner scope",
    "source": "Appendix F.4"
  },
  {
    "area": "SaaS Billing",
    "method": "POST",
    "endpoint": "/api/v1/saas/invoices/:id/post",
    "purpose": "Post SaaS invoice",
    "permission": "",
    "notes": "Platform owner scope",
    "source": "Appendix F.4"
  },
  {
    "area": "Service",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/offline-sync",
    "purpose": "Synchronize technician PWA offline work-order commands, evidence references, checklist updates, status updates, service-report data and parts usage",
    "permission": "",
    "notes": "Authenticated technician portal scope; assigned technician only; tenant and branch enforced; idempotent by deviceId and clientCommandId.",
    "source": "Appendix G.11"
  },
  {
    "area": "Integrations",
    "method": "GET",
    "endpoint": "/api/v1/integration-webhooks",
    "purpose": "List integration webhooks",
    "permission": "integration.webhook.view",
    "notes": "Tenant-scoped webhook registry",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "GET",
    "endpoint": "/api/v1/integration-webhooks/:id",
    "purpose": "Get integration webhook details",
    "permission": "integration.webhook.view",
    "notes": "Tenant scoped; raw target URL not exposed",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "POST",
    "endpoint": "/api/v1/integration-webhooks",
    "purpose": "Create integration webhook",
    "permission": "integration.webhook.manage",
    "notes": "Requires HTTPS target and tenant connection",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "PATCH",
    "endpoint": "/api/v1/integration-webhooks/:id",
    "purpose": "Update integration webhook",
    "permission": "integration.webhook.manage",
    "notes": "Audited config change; hashes target URL",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "POST",
    "endpoint": "/api/v1/integration-webhooks/:id/activate",
    "purpose": "Activate integration webhook",
    "permission": "integration.webhook.manage",
    "notes": "Audited state change",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "POST",
    "endpoint": "/api/v1/integration-webhooks/:id/deactivate",
    "purpose": "Deactivate integration webhook",
    "permission": "integration.webhook.manage",
    "notes": "Audited state change",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "GET",
    "endpoint": "/api/v1/integration-webhook-deliveries",
    "purpose": "List webhook delivery attempts",
    "permission": "integration.webhook.view",
    "notes": "Tenant-scoped delivery evidence",
    "source": "Pass 17"
  },
  {
    "area": "Integrations",
    "method": "POST",
    "endpoint": "/api/v1/integration-webhooks/:id/test-delivery",
    "purpose": "Queue webhook test delivery",
    "permission": "integration.webhook.manage",
    "notes": "Creates delivery record and business event after validation",
    "source": "Pass 17"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/report-templates",
    "purpose": "List report templates",
    "permission": "report.view",
    "notes": "Tenant scoped and permission scoped",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/report-templates/:id",
    "purpose": "Report template detail",
    "permission": "report.view",
    "notes": "Source permission scope enforced",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "PATCH",
    "endpoint": "/api/v1/report-templates/:id",
    "purpose": "Update report template",
    "permission": "report_builder.manage",
    "notes": "Field allowlist and audit enforced",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/saved-reports",
    "purpose": "List saved reports",
    "permission": "report.view",
    "notes": "Owner and source permission scoped",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/saved-reports/:id",
    "purpose": "Saved report detail",
    "permission": "report.view",
    "notes": "Cannot weaken source permissions",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "PATCH",
    "endpoint": "/api/v1/saved-reports/:id",
    "purpose": "Update saved report",
    "permission": "report_builder.manage",
    "notes": "Selected fields remain allowlisted",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/scheduled-reports",
    "purpose": "List scheduled reports",
    "permission": "report.view",
    "notes": "Auditable schedule listing",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/scheduled-reports/:id",
    "purpose": "Scheduled report detail",
    "permission": "report.view",
    "notes": "Permission scope inherited from saved report",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "PATCH",
    "endpoint": "/api/v1/scheduled-reports/:id",
    "purpose": "Update scheduled report",
    "permission": "report_builder.manage",
    "notes": "Recipient safety and audit enforced",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/report-executions",
    "purpose": "List report executions",
    "permission": "report.view",
    "notes": "Report export evidence and worker status",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/dashboards/widgets",
    "purpose": "List dashboard widgets",
    "permission": "report.view",
    "notes": "Role dashboard widget read model",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "POST",
    "endpoint": "/api/v1/dashboards/widgets",
    "purpose": "Create dashboard widget",
    "permission": "report_builder.manage",
    "notes": "Permission scoped widget configuration",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/saved-views",
    "purpose": "List saved grid views",
    "permission": "report.view",
    "notes": "Current user and permission scoped",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "GET",
    "endpoint": "/api/v1/saved-views/:id",
    "purpose": "Saved view detail",
    "permission": "report.view",
    "notes": "Current user scope enforced",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "POST",
    "endpoint": "/api/v1/saved-views",
    "purpose": "Create saved grid view",
    "permission": "report_builder.manage",
    "notes": "Columns filters and sort preserved",
    "source": "Pass 19"
  },
  {
    "area": "Reports",
    "method": "PATCH",
    "endpoint": "/api/v1/saved-views/:id",
    "purpose": "Update saved grid view",
    "permission": "report_builder.manage",
    "notes": "RBAC and audit enforced",
    "source": "Pass 19"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/dashboard",
    "purpose": "Customer portal dashboard",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/projects",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/contracts",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/sites",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/assets",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/tickets",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/invoices",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/payments",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/customer/documents",
    "purpose": "Customer portal linked-record resource",
    "permission": "customer.view",
    "notes": "Portal account linked customer, tenant and document/payment scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "POST",
    "endpoint": "/api/v1/portal/customer/tickets",
    "purpose": "Create customer portal ticket",
    "permission": "ticket.create",
    "notes": "Creates ticket only for linked customer and audits portal action.",
    "source": "Pass 20"
  },
  {
    "area": "Customer Portal",
    "method": "POST",
    "endpoint": "/api/v1/portal/customer/work-orders/:id/confirm",
    "purpose": "Confirm completed work order",
    "permission": "ticket.resolve",
    "notes": "Customer portal can confirm only linked customer work order.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/dashboard",
    "purpose": "Vendor portal dashboard",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/rfqs",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/quotations",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/purchase-orders",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/deliveries",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/invoices",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/payments",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/performance",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "GET",
    "endpoint": "/api/v1/portal/vendor/documents",
    "purpose": "Vendor portal linked-record resource",
    "permission": "vendor.view",
    "notes": "Portal account linked vendor and tenant scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "POST",
    "endpoint": "/api/v1/portal/vendor/quotations",
    "purpose": "Submit vendor quotation",
    "permission": "supplier_quotation.create",
    "notes": "Vendor can submit quotation only for linked vendor RFQ invitation.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "POST",
    "endpoint": "/api/v1/portal/vendor/purchase-orders/:id/acknowledge",
    "purpose": "Acknowledge vendor purchase order",
    "permission": "purchase_order.view",
    "notes": "Vendor can acknowledge only linked vendor PO.",
    "source": "Pass 20"
  },
  {
    "area": "Vendor Portal",
    "method": "POST",
    "endpoint": "/api/v1/portal/vendor/invoices",
    "purpose": "Submit vendor invoice",
    "permission": "supplier_invoice.create",
    "notes": "Vendor invoice is linked to vendor, PO/GRN and three-way match flow.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "GET",
    "endpoint": "/api/v1/portal/technician/dashboard",
    "purpose": "Technician PWA assigned work resource",
    "permission": "workorder.view",
    "notes": "Assigned technician, tenant and branch scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "GET",
    "endpoint": "/api/v1/portal/technician/jobs",
    "purpose": "Technician PWA assigned work resource",
    "permission": "workorder.view",
    "notes": "Assigned technician, tenant and branch scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "GET",
    "endpoint": "/api/v1/portal/technician/work-orders/:id",
    "purpose": "Technician PWA assigned work resource",
    "permission": "workorder.view",
    "notes": "Assigned technician, tenant and branch scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "GET",
    "endpoint": "/api/v1/portal/technician/offline-queue",
    "purpose": "Technician PWA assigned work resource",
    "permission": "workorder.view",
    "notes": "Assigned technician, tenant and branch scope enforced.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/accept",
    "purpose": "Technician work-order accept command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/start-travel",
    "purpose": "Technician work-order start-travel command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/arrive",
    "purpose": "Technician work-order arrive command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/check-in",
    "purpose": "Technician work-order check-in command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/location",
    "purpose": "Technician work-order location command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/start",
    "purpose": "Technician work-order start command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/service-report",
    "purpose": "Technician work-order service-report command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/check-out",
    "purpose": "Technician work-order check-out command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "Technician PWA",
    "method": "POST",
    "endpoint": "/api/v1/portal/technician/work-orders/:id/complete",
    "purpose": "Technician work-order complete command",
    "permission": "workorder.update",
    "notes": "Assigned technician only; evidence uses Document IDs and audit trail.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "POST",
    "endpoint": "/api/v1/saas/plans",
    "purpose": "Create SaaS plan",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/plans/:id",
    "purpose": "SaaS plan detail",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "PATCH",
    "endpoint": "/api/v1/saas/plans/:id",
    "purpose": "Update SaaS plan",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/subscriptions",
    "purpose": "List SaaS subscriptions",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/subscriptions/:id",
    "purpose": "SaaS subscription detail",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "PATCH",
    "endpoint": "/api/v1/saas/subscriptions/:id",
    "purpose": "Update SaaS subscription",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/usage/:id",
    "purpose": "SaaS usage detail",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "POST",
    "endpoint": "/api/v1/saas/usage/collect",
    "purpose": "Collect tenant usage metrics",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/invoices",
    "purpose": "List SaaS invoices",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "POST",
    "endpoint": "/api/v1/saas/invoices",
    "purpose": "Create SaaS invoice",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "GET",
    "endpoint": "/api/v1/saas/invoices/:id",
    "purpose": "SaaS invoice detail",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  },
  {
    "area": "SaaS Billing",
    "method": "PATCH",
    "endpoint": "/api/v1/saas/invoices/:id",
    "purpose": "Update SaaS invoice",
    "permission": "saas.manage",
    "notes": "Platform owner/admin only; plan limits, usage and billing are audit controlled.",
    "source": "Pass 20"
  }
] as const satisfies readonly LockedEndpointDefinition[];
