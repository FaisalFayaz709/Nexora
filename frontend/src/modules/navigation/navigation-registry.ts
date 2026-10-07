import type { FrontendRuntimeSurface, PermissionKey } from '@nexora/shared';

export type FrontendNavigationItem = {
  readonly label: string;
  readonly href: string;
  readonly moduleKey: string;
  readonly requiredPermission: PermissionKey;
  readonly surface: FrontendRuntimeSurface;
  readonly highRiskSurface?: boolean;
};

export const FrontendNavigationRegistry = [
  { label: 'Dashboard', href: '/', moduleKey: 'organization', requiredPermission: 'organization.view', surface: 'APP_SHELL' },
  { label: 'Organization Admin', href: '/organization', moduleKey: 'organization', requiredPermission: 'organization.view', surface: 'MODULE_PAGE' },
  { label: 'Tenant Users', href: '/users', moduleKey: 'identity', requiredPermission: 'identity.user.view', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Roles', href: '/roles', moduleKey: 'identity', requiredPermission: 'identity.role.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Permissions', href: '/permissions', moduleKey: 'identity', requiredPermission: 'identity.role.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'RBAC Matrix', href: '/rbac', moduleKey: 'identity', requiredPermission: 'identity.role.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Organization Settings', href: '/organization-settings', moduleKey: 'organization', requiredPermission: 'organization.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Teams', href: '/teams', moduleKey: 'organization', requiredPermission: 'organization.view', surface: 'MODULE_PAGE' },
  { label: 'Number Sequences', href: '/number-sequences', moduleKey: 'organization', requiredPermission: 'number_sequence.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Branches', href: '/branches', moduleKey: 'organization', requiredPermission: 'branch.view', surface: 'MODULE_PAGE' },
  { label: 'Departments', href: '/departments', moduleKey: 'organization', requiredPermission: 'department.view', surface: 'MODULE_PAGE' },
  { label: 'Active Sessions', href: '/auth/sessions', moduleKey: 'identity', requiredPermission: 'identity.user.view', surface: 'MODULE_PAGE' },
  { label: 'Customers', href: '/customers', moduleKey: 'customers', requiredPermission: 'customer.view', surface: 'MODULE_PAGE' },
  { label: 'Vendors', href: '/vendors', moduleKey: 'vendors', requiredPermission: 'vendor.view', surface: 'MODULE_PAGE' },
  { label: 'Employees', href: '/employees', moduleKey: 'hr', requiredPermission: 'employee.view', surface: 'MODULE_PAGE' },
  { label: 'Products', href: '/products', moduleKey: 'inventory', requiredPermission: 'product.view', surface: 'MODULE_PAGE' },
  { label: 'Warehouses', href: '/warehouses', moduleKey: 'inventory', requiredPermission: 'warehouse.view', surface: 'MODULE_PAGE' },
  { label: 'Inventory Core', href: '/inventory', moduleKey: 'inventory', requiredPermission: 'inventory.view', surface: 'MODULE_PAGE' },
  { label: 'Stock Balances', href: '/inventory/stock', moduleKey: 'inventory', requiredPermission: 'inventory.view', surface: 'MODULE_PAGE' },
  { label: 'Stock Ledger', href: '/inventory/ledger', moduleKey: 'inventory', requiredPermission: 'inventory.view', surface: 'MODULE_PAGE' },
  { label: 'Stock Reservations', href: '/inventory/reservations', moduleKey: 'inventory', requiredPermission: 'inventory.reserve', surface: 'MODULE_PAGE' },
  { label: 'Stock Transfers', href: '/inventory/transfers', moduleKey: 'inventory', requiredPermission: 'inventory.transfer', surface: 'MODULE_PAGE' },
  { label: 'Stock Adjustments', href: '/inventory/adjustments', moduleKey: 'inventory', requiredPermission: 'inventory.adjust', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Serial Lookup', href: '/inventory/serials', moduleKey: 'inventory', requiredPermission: 'inventory.view', surface: 'MODULE_PAGE' },
  { label: 'Approval Engine', href: '/approvals/engine', moduleKey: 'approvals', requiredPermission: 'approval.view', surface: 'MODULE_PAGE' },
  { label: 'Approval Inbox', href: '/approvals', moduleKey: 'approvals', requiredPermission: 'approval.act', surface: 'MODULE_PAGE' },
  { label: 'Approval Definitions', href: '/approval-definitions', moduleKey: 'approvals', requiredPermission: 'workflow.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Workflow Rules', href: '/workflow-rules', moduleKey: 'approvals', requiredPermission: 'workflow.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Procurement Workflow', href: '/procurement/workflow', moduleKey: 'procurement', requiredPermission: 'purchase_request.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Purchase Requests', href: '/procurement/purchase-requests', moduleKey: 'procurement', requiredPermission: 'purchase_request.view', surface: 'MODULE_PAGE' },
  { label: 'RFQs', href: '/procurement/rfqs', moduleKey: 'procurement', requiredPermission: 'rfq.view', surface: 'MODULE_PAGE' },
  { label: 'Purchase Orders', href: '/procurement/purchase-orders', moduleKey: 'procurement', requiredPermission: 'purchase_order.view', surface: 'MODULE_PAGE' },
  { label: 'Goods Receipts', href: '/procurement/goods-receipts', moduleKey: 'procurement', requiredPermission: 'goods_receipt.view', surface: 'MODULE_PAGE' },
  { label: 'Supplier Quotations', href: '/procurement/supplier-quotations', moduleKey: 'procurement', requiredPermission: 'supplier_quotation.view', surface: 'MODULE_PAGE' },
  { label: 'Purchase Contracts', href: '/procurement/purchase-contracts', moduleKey: 'procurement', requiredPermission: 'purchase_contract.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Landed Costs', href: '/procurement/landed-costs', moduleKey: 'procurement', requiredPermission: 'landed_cost.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Vendor Onboarding', href: '/procurement/vendor-onboarding', moduleKey: 'procurement', requiredPermission: 'vendor.onboard', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Projects Delivery', href: '/projects/delivery', moduleKey: 'projects', requiredPermission: 'project.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Projects', href: '/projects', moduleKey: 'projects', requiredPermission: 'project.view', surface: 'MODULE_PAGE' },
  { label: 'Project Tasks', href: '/project-tasks', moduleKey: 'projects', requiredPermission: 'project_task.view', surface: 'MODULE_PAGE' },
  { label: 'Project Budget', href: '/projects/budget', moduleKey: 'projects', requiredPermission: 'project.view_financials', surface: 'MODULE_PAGE' },
  { label: 'Asset Lifecycle', href: '/assets/lifecycle', moduleKey: 'assets', requiredPermission: 'asset.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Asset Completion', href: '/assets/completion', moduleKey: 'assets', requiredPermission: 'asset.view', surface: 'MODULE_PAGE' },
  { label: 'Assets', href: '/assets', moduleKey: 'assets', requiredPermission: 'asset.view', surface: 'MODULE_PAGE' },

  { label: 'Projects Assets Completion', href: '/projects/assets-completion', moduleKey: 'projects', requiredPermission: 'project.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Create Project', href: '/projects/create', moduleKey: 'projects', requiredPermission: 'project.create', surface: 'MODULE_PAGE' },
  { label: 'Create Project Task', href: '/project-tasks/create', moduleKey: 'projects', requiredPermission: 'project_task.create', surface: 'MODULE_PAGE' },
  { label: 'Create Asset', href: '/assets/create', moduleKey: 'assets', requiredPermission: 'asset.create', surface: 'MODULE_PAGE' },
  { label: 'Register Asset From Stock', href: '/assets/register-from-stock', moduleKey: 'assets', requiredPermission: 'asset.create', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Field Service Flow', href: '/service/field-operations', moduleKey: 'service', requiredPermission: 'workorder.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Field Service Completion', href: '/service/completion', moduleKey: 'service', requiredPermission: 'workorder.view', surface: 'MODULE_PAGE' },
  { label: 'Tickets', href: '/tickets', moduleKey: 'service', requiredPermission: 'ticket.view', surface: 'MODULE_PAGE' },
  { label: 'Work Orders', href: '/work-orders', moduleKey: 'service', requiredPermission: 'workorder.view', surface: 'MODULE_PAGE' },
  { label: 'Maintenance Workbench', href: '/maintenance/workbench', moduleKey: 'maintenance', requiredPermission: 'maintenance.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Maintenance Completion', href: '/maintenance/completion', moduleKey: 'maintenance', requiredPermission: 'maintenance.view', surface: 'MODULE_PAGE' },
  { label: 'Maintenance Plans', href: '/maintenance', moduleKey: 'maintenance', requiredPermission: 'maintenance.view', surface: 'MODULE_PAGE' },
  { label: 'Maintenance Schedule', href: '/maintenance-schedule', moduleKey: 'maintenance', requiredPermission: 'maintenance.view', surface: 'MODULE_PAGE' },

  { label: 'Create Ticket', href: '/tickets/create', moduleKey: 'service', requiredPermission: 'ticket.create', surface: 'MODULE_PAGE' },
  { label: 'Create Work Order', href: '/work-orders/create', moduleKey: 'service', requiredPermission: 'workorder.create', surface: 'MODULE_PAGE' },
  { label: 'Technician PWA Jobs', href: '/technician-pwa/jobs', moduleKey: 'service', requiredPermission: 'workorder.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Technician Offline Queue', href: '/technician-pwa/offline-queue', moduleKey: 'service', requiredPermission: 'workorder.update', surface: 'PWA_OFFLINE_QUEUE', highRiskSurface: true },
  { label: 'Technician Offline Sync', href: '/technician-pwa/sync', moduleKey: 'service', requiredPermission: 'workorder.update', surface: 'PWA_OFFLINE_QUEUE', highRiskSurface: true },
  { label: 'Create Maintenance Plan', href: '/maintenance/create', moduleKey: 'maintenance', requiredPermission: 'maintenance.create', surface: 'MODULE_PAGE' },
  { label: 'Maintenance Schedule Detail', href: '/maintenance/schedule', moduleKey: 'maintenance', requiredPermission: 'maintenance.view', surface: 'MODULE_PAGE' },
  { label: 'Finance Workbench', href: '/finance/workbench', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Commercial MVP', href: '/commercial-mvp', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'MODULE_PAGE' },
  { label: 'Customer Invoices', href: '/customer-invoices', moduleKey: 'finance', requiredPermission: 'invoice.view', surface: 'MODULE_PAGE' },
  { label: 'Supplier Invoices', href: '/supplier-invoices', moduleKey: 'finance', requiredPermission: 'supplier_invoice.view', surface: 'MODULE_PAGE' },
  { label: 'Payments', href: '/payments', moduleKey: 'finance', requiredPermission: 'payment.view', surface: 'MODULE_PAGE' },
  // Pass R15 finance frontend completion navigation
  { label: 'Finance Completion', href: '/finance/completion', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Create Customer Invoice', href: '/customer-invoices/create', moduleKey: 'finance', requiredPermission: 'invoice.create', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Create Supplier Invoice', href: '/supplier-invoices/create', moduleKey: 'finance', requiredPermission: 'supplier_invoice.create', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Record Payment', href: '/payments/create', moduleKey: 'finance', requiredPermission: 'payment.create', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Expenses', href: '/expenses', moduleKey: 'finance', requiredPermission: 'expense.view', surface: 'MODULE_PAGE' },
  { label: 'Create Expense', href: '/expenses/create', moduleKey: 'finance', requiredPermission: 'expense.create', surface: 'COMMAND_FORM' },
  { label: 'Chart of Accounts', href: '/accounts', moduleKey: 'finance', requiredPermission: 'account.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Journal Entries', href: '/journal-entries', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Create Journal Entry', href: '/journal-entries/create', moduleKey: 'finance', requiredPermission: 'journal.create', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'AR Aging', href: '/finance/receivables', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'READ_MODEL_PANEL' },
  { label: 'AP Aging', href: '/finance/payables', moduleKey: 'finance', requiredPermission: 'finance.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Tax Codes', href: '/tax-codes', moduleKey: 'finance', requiredPermission: 'tax.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Tax Calculation', href: '/tax/calculate', moduleKey: 'finance', requiredPermission: 'tax.manage', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Tax Reports', href: '/tax/reports', moduleKey: 'finance', requiredPermission: 'tax.manage', surface: 'READ_MODEL_PANEL' },
  { label: 'Bank Accounts', href: '/bank-accounts', moduleKey: 'finance', requiredPermission: 'bank.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Bank and Cash Management', href: '/finance/bank-cash', moduleKey: 'finance', requiredPermission: 'bank.manage', surface: 'WORKFLOW_WORKBENCH', highRiskSurface: true },
  { label: 'Bank Statement Import', href: '/bank-statements/import', moduleKey: 'finance', requiredPermission: 'bank.manage', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Payment Voucher', href: '/vouchers/payment', moduleKey: 'finance', requiredPermission: 'bank.manage', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Receipt Voucher', href: '/vouchers/receipt', moduleKey: 'finance', requiredPermission: 'bank.manage', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Documents Delivery Completion', href: '/documents-notifications/completion', moduleKey: 'documents', requiredPermission: 'document.view', surface: 'DOCUMENT_EVIDENCE' },
  { label: 'Documents & Notifications', href: '/documents-notifications', moduleKey: 'documents', requiredPermission: 'document.view', surface: 'DOCUMENT_EVIDENCE' },
  { label: 'Documents', href: '/documents', moduleKey: 'documents', requiredPermission: 'document.view', surface: 'DOCUMENT_EVIDENCE' },
  { label: 'Notifications', href: '/notifications', moduleKey: 'notifications', requiredPermission: 'communication.view', surface: 'MODULE_PAGE' },
  { label: 'Communications', href: '/communications', moduleKey: 'notifications', requiredPermission: 'communication.view', surface: 'MODULE_PAGE' },
  { label: 'Reports Workbench', href: '/reports-workbench', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Reports Completion', href: '/reports/completion', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'MODULE_PAGE' },
  { label: 'Reports', href: '/reports', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'MODULE_PAGE' },
  { label: 'Global Search', href: '/search', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Calendar', href: '/calendar', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Portals Completion', href: '/portals/completion', moduleKey: 'portal', requiredPermission: 'workflow.manage', surface: 'PORTAL_WORKSPACE' },
  { label: 'Portals Workbench', href: '/portals', moduleKey: 'portal', requiredPermission: 'workflow.manage', surface: 'PORTAL_WORKSPACE' },
  { label: 'Customer Portal', href: '/customer-portal', moduleKey: 'portal', requiredPermission: 'customer.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Vendor Portal', href: '/vendor-portal', moduleKey: 'portal', requiredPermission: 'vendor.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Technician PWA', href: '/technician-pwa', moduleKey: 'portal', requiredPermission: 'workorder.view', surface: 'PWA_OFFLINE_QUEUE' },
  { label: 'Workflow Completion', href: '/workflow-completion', moduleKey: 'workflow', requiredPermission: 'workflow.manage', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Frontend Runtime Gates', href: '/workflow-completion/runtime', moduleKey: 'workflow', requiredPermission: 'workflow.manage', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Security Hardening', href: '/security-hardening', moduleKey: 'security', requiredPermission: 'audit.view', surface: 'MODULE_PAGE' },
  { label: 'E2E Certification', href: '/e2e-certification', moduleKey: 'security', requiredPermission: 'audit.view', surface: 'MODULE_PAGE' },
  { label: 'Release Candidate', href: '/release-candidate', moduleKey: 'security', requiredPermission: 'audit.view', surface: 'MODULE_PAGE' },

  // Pass R16 platform, portals and reports completion navigation
  { label: 'Platform Completion', href: '/platform/completion', moduleKey: 'platform', requiredPermission: 'workflow.manage', surface: 'WORKFLOW_WORKBENCH' },
  { label: 'Document Upload Flow', href: '/documents/upload', moduleKey: 'documents', requiredPermission: 'document.create', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Report Templates', href: '/report-builder/templates', moduleKey: 'reports', requiredPermission: 'report_builder.manage', surface: 'MODULE_PAGE' },
  { label: 'Saved Reports', href: '/report-builder/saved-reports', moduleKey: 'reports', requiredPermission: 'report_builder.manage', surface: 'MODULE_PAGE' },
  { label: 'Scheduled Reports', href: '/report-builder/scheduled-reports', moduleKey: 'reports', requiredPermission: 'report_builder.manage', surface: 'MODULE_PAGE' },
  { label: 'Report Exports', href: '/reports/exports', moduleKey: 'reports', requiredPermission: 'report.export', surface: 'WORKFLOW_WORKBENCH', highRiskSurface: true },
  { label: 'Report Executions', href: '/report-executions', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Saved Views', href: '/saved-views', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Dashboard Widgets', href: '/dashboards/widgets', moduleKey: 'reports', requiredPermission: 'report.view', surface: 'READ_MODEL_PANEL' },
  { label: 'Communication Templates', href: '/communication-templates', moduleKey: 'notifications', requiredPermission: 'communication.view', surface: 'MODULE_PAGE' },
  { label: 'Send Communication', href: '/communications/send', moduleKey: 'notifications', requiredPermission: 'communication.send', surface: 'COMMAND_FORM', highRiskSurface: true },
  { label: 'Notification Read All', href: '/notifications/read-all', moduleKey: 'notifications', requiredPermission: 'communication.view', surface: 'COMMAND_FORM' },
  { label: 'Audit Log Detail', href: '/audit-logs', moduleKey: 'platform', requiredPermission: 'audit.view', surface: 'READ_MODEL_PANEL' },
  { label: 'SaaS Plans', href: '/saas/plans', moduleKey: 'platform', requiredPermission: 'saas.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'SaaS Subscriptions', href: '/saas/subscriptions', moduleKey: 'platform', requiredPermission: 'saas.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'SaaS Usage', href: '/saas/usage', moduleKey: 'platform', requiredPermission: 'saas.manage', surface: 'READ_MODEL_PANEL' },
  { label: 'Module Configurations', href: '/module-configurations', moduleKey: 'platform', requiredPermission: 'feature.manage', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Customer Portal Projects', href: '/customer-portal/projects', moduleKey: 'portal', requiredPermission: 'customer.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Customer Portal Assets', href: '/customer-portal/assets', moduleKey: 'portal', requiredPermission: 'asset.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Customer Portal Tickets', href: '/customer-portal/tickets', moduleKey: 'portal', requiredPermission: 'ticket.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Vendor Portal RFQs', href: '/vendor-portal/rfqs', moduleKey: 'portal', requiredPermission: 'rfq.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Vendor Portal POs', href: '/vendor-portal/purchase-orders', moduleKey: 'portal', requiredPermission: 'purchase_order.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Vendor Portal Documents', href: '/vendor-portal/documents', moduleKey: 'portal', requiredPermission: 'document.view', surface: 'PORTAL_WORKSPACE' },
  { label: 'Integration Webhooks', href: '/integrations/webhooks', moduleKey: 'integrations', requiredPermission: 'integration.webhook.view', surface: 'MODULE_PAGE', highRiskSurface: true },
  { label: 'Operations Readiness', href: '/operations/readiness', moduleKey: 'platform', requiredPermission: 'audit.view', surface: 'READ_MODEL_PANEL', highRiskSurface: true },
 ] as const satisfies readonly FrontendNavigationItem[];

export function canRenderM18NavigationItem(
  item: FrontendNavigationItem,
  enabledModules: ReadonlyMap<string, boolean>,
  permissions: readonly string[],
): boolean {
  const moduleEnabled = enabledModules.get(item.moduleKey) !== false;
  const hasPermission = permissions.includes(item.requiredPermission) || permissions.includes('organization.manage');
  return moduleEnabled && hasPermission;
}

export function filterNavigationByM18Scope(
  enabledModules: ReadonlyMap<string, boolean>,
  permissions: readonly string[],
): readonly FrontendNavigationItem[] {
  return FrontendNavigationRegistry.filter((item) => canRenderM18NavigationItem(item, enabledModules, permissions));
}

// M22 Go/No-Go route: /release-candidate/m22

// PASS_20_NAVIGATION: SaaS Invoices /saas/invoices Customer Portal Dashboard Vendor Portal Dashboard Technician PWA Jobs Offline Queue portal users cannot access internal ERP navigation.
