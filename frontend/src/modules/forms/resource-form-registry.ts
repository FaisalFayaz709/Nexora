import { z } from 'zod';
import {
  AssignTicketSchema,
  CreateAssetSchema,
  RegisterAssetFromStockSchema,
  InstallAssetSchema,
  ReplaceAssetSchema,
  RetireAssetSchema,
  RotateAssetQrSchema,
  CreateAssetRmaSchema,
  UpsertProjectBomSchema,
  UpsertProjectBudgetSchema,
  CreateMaterialRequirementSchema,
  AssignWorkOrderSchema,
  BlacklistVendorSchema,
  CloseTicketSchema,
  CompleteProjectHandoverSchema,
  CreateBranchSchema,
  CreateCustomerContractSchema,
  CreateCustomerInvoiceSchema,
  CreateCustomerSchema,
  CreateCustomerSiteSchema,
  CreateDepartmentSchema,
  CreateEmployeeSchema,
  CreateExpenseSchema,
  CreateJournalEntrySchema,
  CreateLandedCostSchema,
  CreateLeadSchema,
  CreateMaintenancePlanSchema,
  CreateNumberSequenceSchema,
  CreateOpportunitySchema,
  CreatePaymentSchema,
  CreateProductSchema,
  CreateProjectRequestSchema,
  CreateProjectTaskSchema,
  CreatePurchaseContractSchema,
  CreatePurchaseOrderSchema,
  CreatePurchaseRequestRequestSchema,
  CreateQuotationSchema,
  CreateRfqSchema,
  CreateSiteSurveySchema,
  CreateStockAdjustmentSchema,
  CreateStockCountSchema,
  CreateStockReservationSchema,
  CreateStockTransferRequestSchema,
  CreateSupplierInvoiceSchema,
  CreateSupplierQuotationSchema,
  CreateTaxRuleSchema,
  TaxCalculateSchema,
  ImportBankStatementSchema,
  CloseBankReconciliationSchema,
  PaymentVoucherSchema,
  ReceiptVoucherSchema,
  CreateRoleSchema,
  CreateTenantUserSchema,
  CreateTicketRequestSchema,
  CreateVendorOnboardingRequestSchema,
  CreateVendorSchema,
  CreateWarehouseSchema,
  CreateWorkOrderSchema,
  EmptyCommandSchema,
  ReceiveGoodsRequestSchema,
  ResolveTicketSchema,
  WorkOrderCommandNoteSchema,
  CreateServiceReportSchema,
  GenerateMaintenanceWorkOrderSchema,
  CompleteMaintenanceExecutionSchema,
  TechnicianCheckInSchema,
  TechnicianCheckOutSchema,
  TechnicianOfflineSyncBatchSchema,
  CreateWorkflowRuleSchema,
  ReportTemplateCreateSchema,
  SavedReportCreateSchema,
  ScheduledReportCreateSchema,
  SavedViewCreateSchema,
  DashboardWidgetCreateSchema,
  CreateSaaSPlanSchema,
  UpdateSaaSPlanSchema,
  CreateSaaSSubscriptionSchema,
  UpdateSaaSSubscriptionSchema,
  CreateSaaSInvoiceSchema,
  UpdateSaaSInvoiceSchema,
} from '@nexora/shared';

import { createNexoraQueryKey } from '@/lib/query-client';
import type { CommandFormDefinition, ResourceFormDefinition, ResourceFormField } from '@/components/forms';

const uuidDescription = 'Select an existing record id from a controlled picker in the full module CRUD pass; typed as UUID by the shared Zod contract.';

const commonCodeNameFields: ResourceFormField[] = [
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'name', label: 'Name', type: 'text', required: true },
];

const lineItemNotice = 'Line arrays are represented by controlled module-owned field arrays. Procurement Pass 09 replaces hidden line placeholders for PR, supplier quotation and GRN with RHF field arrays that submit typed arrays to shared Zod contracts.';


const purchaseRequestItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'quantity', label: 'Quantity', type: 'quantity', required: true },
  { name: 'estimatedUnitPrice', label: 'Estimated unit price', type: 'money', required: true },
];

const supplierQuotationItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'quantity', label: 'Quantity', type: 'quantity', required: true },
  { name: 'unitPrice', label: 'Unit price', type: 'money', required: true },
  { name: 'deliveryDays', label: 'Delivery days', type: 'number', required: true },
  { name: 'warrantyMonths', label: 'Warranty months', type: 'number', required: true },
];


const quotationItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', description: uuidDescription },
  { name: 'description', label: 'Description', type: 'text', required: true },
  { name: 'quantity', label: 'Quantity', type: 'quantity', required: true },
  { name: 'unitPrice', label: 'Unit price', type: 'money', required: true },
  { name: 'taxCodeId', label: 'Tax code', type: 'text', description: uuidDescription },
];

const goodsReceiptItemFields: ResourceFormField[] = [
  { name: 'purchaseOrderItemId', label: 'PO item', type: 'text', required: true, description: uuidDescription },
  { name: 'receivedQty', label: 'Received quantity', type: 'quantity', required: true },
  { name: 'acceptedQty', label: 'Accepted quantity', type: 'quantity', required: true },
  { name: 'damagedQty', label: 'Damaged quantity', type: 'quantity', required: true },
  { name: 'serialNumbers', label: 'Serial numbers JSON', type: 'json', description: 'Use a JSON array such as ["SN1001", "SN1002"]. Serialized products must match accepted quantity.' },
  { name: 'batches', label: 'Batch/lot JSON', type: 'json', description: 'Use a JSON array of {"lotNo","quantity","manufactureDate","expiryDate"} objects for batch-tracked products.' },
];


const stockTransferItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'quantity', label: 'Quantity', type: 'quantity', required: true },
];

const stockAdjustmentLineFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'locationId', label: 'Location', type: 'text', description: 'Optional warehouse location UUID.' },
  { name: 'quantityDelta', label: 'Quantity delta', type: 'quantity', required: true, description: 'Positive increases stock; negative decreases stock. Backend controls approval thresholds.' },
  { name: 'serialNumbers', label: 'Serial numbers JSON', type: 'json', description: 'Optional JSON array for serialized product adjustment evidence.' },
  { name: 'batches', label: 'Batch allocations JSON', type: 'json', description: 'Optional JSON array like [{"lotNo":"LOT-001","quantity":"1.0000"}].' },
];

const technicianOfflineCommandFields: ResourceFormField[] = [
  { name: 'clientCommandId', label: 'Client command id', type: 'text', required: true },
  { name: 'workOrderId', label: 'Work order', type: 'text', required: true, description: uuidDescription },
  { name: 'type', label: 'Command type', type: 'select', required: true, options: [
    { label: 'Accept', value: 'ACCEPT' },
    { label: 'Start travel', value: 'START_TRAVEL' },
    { label: 'Arrive', value: 'ARRIVE' },
    { label: 'Status change', value: 'STATUS_CHANGE' },
    { label: 'Checklist update', value: 'CHECKLIST_UPDATE' },
    { label: 'Check in', value: 'CHECK_IN' },
    { label: 'Location', value: 'LOCATION' },
    { label: 'Start work', value: 'START_WORK' },
    { label: 'Add photo', value: 'ADD_PHOTO' },
    { label: 'Use part', value: 'USE_PART' },
    { label: 'Signature', value: 'SIGNATURE' },
    { label: 'Service report', value: 'SERVICE_REPORT' },
    { label: 'Check out', value: 'CHECK_OUT' },
    { label: 'Complete', value: 'COMPLETE' },
  ] },
  { name: 'occurredAt', label: 'Occurred at', type: 'text', required: true },
  { name: 'payload', label: 'Command payload JSON', type: 'json', description: 'Use a small JSON object; files/photos/signatures should reference document ids rather than raw blobs.' },
];



const projectBomItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'requiredQty', label: 'Required quantity', type: 'quantity', required: true },
];

const projectBudgetLineFields: ResourceFormField[] = [
  { name: 'category', label: 'Budget category', type: 'text', required: true },
  { name: 'budgetAmount', label: 'Budget amount', type: 'money', required: true },
];

const purchaseContractItemFields: ResourceFormField[] = [
  { name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription },
  { name: 'agreedRate', label: 'Agreed rate', type: 'money', required: true },
  { name: 'maxQuantity', label: 'Maximum quantity', type: 'quantity', description: 'Optional when max value is set. Backend still requires maxQuantity or maxValue per item.' },
  { name: 'maxValue', label: 'Maximum value', type: 'money', description: 'Optional when max quantity is set. Backend validates remaining release value.' },
];

const landedCostLineFields: ResourceFormField[] = [
  { name: 'costType', label: 'Cost type', type: 'select', required: true, options: [
    { label: 'Freight', value: 'FREIGHT' },
    { label: 'Customs', value: 'CUSTOMS' },
    { label: 'Insurance', value: 'INSURANCE' },
    { label: 'Handling', value: 'HANDLING' },
    { label: 'Transport', value: 'TRANSPORT' },
    { label: 'Other', value: 'OTHER' },
  ] },
  { name: 'description', label: 'Description', type: 'text', required: true },
  { name: 'amount', label: 'Amount', type: 'money', required: true },
  { name: 'accountId', label: 'Cost account', type: 'text', description: `${uuidDescription} Optional; backend defaults to the configured commercial cost account.` },
];

const vendorDocumentEvidenceFields: ResourceFormField[] = [
  { name: 'documentType', label: 'Document type', type: 'text', required: true },
  { name: 'documentId', label: 'Document id', type: 'text', description: uuidDescription },
  { name: 'verified', label: 'Verified', type: 'checkbox' },
  { name: 'note', label: 'Verification note', type: 'textarea' },
];


function castSchema<TValues extends Record<string, unknown>>(schema: z.ZodTypeAny): z.ZodType<TValues> {
  return schema as z.ZodType<TValues>;
}

function defaults<TValues extends Record<string, unknown>>(value: TValues): TValues {
  return value;
}

function keyFor(resourceKey: string) {
  return createNexoraQueryKey('resource-form', resourceKey);
}

export function createResourceDefinition(input: Omit<ResourceFormDefinition<Record<string, unknown>>, 'invalidateKeys'> & { invalidateKeys?: readonly unknown[] }): ResourceFormDefinition<Record<string, unknown>> {
  return {
    ...input,
    invalidateKeys: input.invalidateKeys ?? [keyFor(input.resourceKey), createNexoraQueryKey('frontend-grid', input.endpoint)],
  };
}


export const ResourceFormRegistry = {

  '/report-templates': createResourceDefinition({
    resourceKey: 'report-templates', title: 'Report Template', endpoint: '/report-templates', schema: castSchema(ReportTemplateCreateSchema),
    defaultValues: defaults({ name: '', description: '', dataSource: 'PROJECTS', selectedFields: ['projectNo','status'], filterJson: {}, chartType: 'TABLE', permissionScope: ['project.view'], isSystem: false }),
    fields: [{ name: 'name', label: 'Template name', type: 'text', required: true }, { name: 'description', label: 'Description', type: 'textarea' }, { name: 'dataSource', label: 'Data source', type: 'select', options: [{ label: 'Projects', value: 'PROJECTS' }, { label: 'Customers', value: 'CUSTOMERS' }, { label: 'Vendors', value: 'VENDORS' }, { label: 'Procurement', value: 'PROCUREMENT' }, { label: 'Inventory', value: 'INVENTORY' }, { label: 'Assets', value: 'ASSETS' }, { label: 'Field service', value: 'FIELD_SERVICE' }, { label: 'Maintenance', value: 'MAINTENANCE' }, { label: 'Finance AR', value: 'FINANCE_AR' }, { label: 'Finance AP', value: 'FINANCE_AP' }, { label: 'HR employees', value: 'HR_EMPLOYEES' }, { label: 'Audit', value: 'AUDIT' }] }, { name: 'selectedFields', label: 'Selected fields JSON', type: 'json', description: 'Array of allowlisted fields for the selected data source.' }, { name: 'filterJson', label: 'Default filters JSON', type: 'json' }, { name: 'chartType', label: 'Chart type', type: 'select', options: [{ label: 'Table', value: 'TABLE' }, { label: 'Bar', value: 'BAR' }, { label: 'Line', value: 'LINE' }, { label: 'Pie', value: 'PIE' }, { label: 'KPI', value: 'KPI' }] }, { name: 'permissionScope', label: 'Permission scope JSON', type: 'json', description: 'Must include the source module view permission; backend rejects weakened scopes.' }, { name: 'isSystem', label: 'System template', type: 'checkbox' }],
    description: 'Pass 19 report-template form keeps selected fields allowlisted and source permission scope backend-authoritative.', idempotent: true,
  }),
  '/saved-reports': createResourceDefinition({
    resourceKey: 'saved-reports', title: 'Saved Report', endpoint: '/saved-reports', schema: castSchema(SavedReportCreateSchema),
    defaultValues: defaults({ templateId: '', name: '', selectedFields: ['projectNo','status'], filterJson: {}, chartType: 'TABLE', permissionScope: ['project.view'] }),
    fields: [{ name: 'templateId', label: 'Template UUID', type: 'text', required: true, description: uuidDescription }, { name: 'name', label: 'Saved report name', type: 'text', required: true }, { name: 'selectedFields', label: 'Selected fields JSON', type: 'json' }, { name: 'filterJson', label: 'Filters JSON', type: 'json' }, { name: 'chartType', label: 'Chart type', type: 'select', options: [{ label: 'Table', value: 'TABLE' }, { label: 'Bar', value: 'BAR' }, { label: 'Line', value: 'LINE' }, { label: 'Pie', value: 'PIE' }, { label: 'KPI', value: 'KPI' }] }, { name: 'permissionScope', label: 'Permission scope JSON', type: 'json' }],
    description: 'Pass 19 saved-report form persists filters/columns without weakening the template source permission scope.', idempotent: true,
  }),
  '/scheduled-reports': createResourceDefinition({
    resourceKey: 'scheduled-reports', title: 'Scheduled Report', endpoint: '/scheduled-reports', schema: castSchema(ScheduledReportCreateSchema),
    defaultValues: defaults({ savedReportId: '', frequency: 'DAILY', timezone: 'Asia/Karachi', nextRunAt: '', recipients: [], active: true }),
    fields: [{ name: 'savedReportId', label: 'Saved report UUID', type: 'text', required: true, description: uuidDescription }, { name: 'frequency', label: 'Frequency', type: 'select', options: [{ label: 'Daily', value: 'DAILY' }, { label: 'Weekly', value: 'WEEKLY' }, { label: 'Monthly', value: 'MONTHLY' }] }, { name: 'timezone', label: 'Timezone', type: 'text' }, { name: 'nextRunAt', label: 'Next run at', type: 'text' }, { name: 'recipients', label: 'Recipients JSON', type: 'json', description: 'Array of recipient emails.' }, { name: 'active', label: 'Active', type: 'checkbox' }],
    description: 'Pass 19 scheduled-report form creates auditable scheduled executions; BullMQ delivery starts only after committed ReportExecution state.', idempotent: true,
  }),
  '/saved-views': createResourceDefinition({
    resourceKey: 'saved-views', title: 'Saved View', endpoint: '/saved-views', schema: castSchema(SavedViewCreateSchema),
    defaultValues: defaults({ entityType: 'Project', name: '', columns: ['projectNo','status'], filterJson: {}, sortJson: {}, permissionScope: ['project.view'], isDefault: false }),
    fields: [{ name: 'entityType', label: 'Entity type', type: 'text', required: true }, { name: 'name', label: 'View name', type: 'text', required: true }, { name: 'columns', label: 'Columns JSON', type: 'json', description: 'Array of visible grid columns.' }, { name: 'filterJson', label: 'Filters JSON', type: 'json' }, { name: 'sortJson', label: 'Sort JSON', type: 'json' }, { name: 'permissionScope', label: 'Permission scope JSON', type: 'json', description: 'Backend checks this scope against the actor; saved views cannot bypass RBAC.' }, { name: 'isDefault', label: 'Default view', type: 'checkbox' }],
    description: 'Pass 19 saved-view form preserves user, tenant and permission scope for reusable grids and dashboards.', idempotent: true,
  }),
  '/dashboards/widgets': createResourceDefinition({
    resourceKey: 'dashboard-widgets', title: 'Dashboard Widget', endpoint: '/dashboards/widgets', schema: castSchema(DashboardWidgetCreateSchema),
    defaultValues: defaults({ title: '', widgetType: 'TABLE', dataSource: 'PROJECTS', savedReportId: undefined, userDashboardId: undefined, layoutJson: {}, configJson: {}, permissionScope: ['project.view'] }),
    fields: [{ name: 'title', label: 'Widget title', type: 'text', required: true }, { name: 'widgetType', label: 'Widget type', type: 'select', options: [{ label: 'Table', value: 'TABLE' }, { label: 'Bar', value: 'BAR' }, { label: 'Line', value: 'LINE' }, { label: 'Pie', value: 'PIE' }, { label: 'KPI', value: 'KPI' }] }, { name: 'dataSource', label: 'Data source', type: 'text', required: true }, { name: 'savedReportId', label: 'Saved report UUID', type: 'text', description: uuidDescription }, { name: 'userDashboardId', label: 'User dashboard UUID', type: 'text', description: uuidDescription }, { name: 'layoutJson', label: 'Layout JSON', type: 'json' }, { name: 'configJson', label: 'Widget config JSON', type: 'json' }, { name: 'permissionScope', label: 'Permission scope JSON', type: 'json' }],
    description: 'Pass 19 dashboard widget form keeps role dashboards read-only and permission-scoped.', idempotent: true,
  }),
  '/users': createResourceDefinition({
    resourceKey: 'tenant-users',
    title: 'Tenant User',
    endpoint: '/users',
    schema: castSchema(CreateTenantUserSchema),
    defaultValues: defaults({ email: '', password: '', branchId: null, roleIds: [] }),
    fields: [
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'password', label: 'Temporary password', type: 'text', createOnly: true, required: true, description: 'Password policy is enforced by the Fastify identity service; never store or display password hashes.' },
      { name: 'branchId', label: 'Branch scope', type: 'text', description: uuidDescription },
      { name: 'roleIds', label: 'Initial roles', type: 'hidden', description: 'Role picker and role assignment commands are completed in the R9 RBAC administration surface.' },
    ],
    description: 'Tenant user create/edit form using the shared Identity Zod contract. Backend remains authoritative for password policy, branch scope, membership status and audit.',
    idempotent: true,
  }),
  '/workflow-rules': createResourceDefinition({
    resourceKey: 'workflow-rules',
    title: 'Workflow / Fraud Control Rule',
    endpoint: '/workflow-rules',
    schema: castSchema(CreateWorkflowRuleSchema),
    defaultValues: defaults({
      triggerType: '',
      subjectType: 'PurchaseRequest',
      name: '',
      description: '',
      severity: 'WARNING',
      condition: { all: [{ field: 'amount', operator: 'GT', value: 250000 }] },
      actions: [{ effect: 'REQUIRE_APPROVAL', approvalSubjectType: 'PurchaseRequest', message: '' }],
      active: true,
    }),
    fields: [
      { name: 'triggerType', label: 'Trigger type', type: 'text', required: true, description: 'Example: purchase.submit, supplier_invoice.approve, payment.create or inventory.adjustment.post.' },
      { name: 'subjectType', label: 'Governed subject type', type: 'text', required: true, description: 'Must be one of the Pass 16 governed workflow subjects.' },
      { name: 'name', label: 'Rule name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'severity', label: 'Severity', type: 'select', required: true, options: [
        { label: 'Info', value: 'INFO' },
        { label: 'Warning', value: 'WARNING' },
        { label: 'High', value: 'HIGH' },
        { label: 'Critical', value: 'CRITICAL' },
      ] },
      { name: 'condition', label: 'Condition JSON', type: 'json', required: true, description: 'Use all/any condition rules. Backend evaluates conditions and remains authoritative.' },
      { name: 'actions', label: 'Actions JSON', type: 'json', required: true, description: 'Actions can ALLOW, BLOCK, REQUIRE_APPROVAL, REQUIRE_SECONDARY_APPROVAL or NOTIFY. Critical effects are audited.' },
      { name: 'active', label: 'Active', type: 'checkbox' },
    ],
    description: 'Pass 16 workflow and fraud-control rule form. It uses RHF/Zod and does not move approval, stock or finance decisions into the frontend.',
    idempotent: true,
  }),
  '/roles': createResourceDefinition({
    resourceKey: 'roles',
    title: 'Role',
    endpoint: '/roles',
    schema: castSchema(CreateRoleSchema),
    defaultValues: defaults({ name: '', mfaRequired: false, permissionKeys: [] }),
    fields: [
      { name: 'name', label: 'Role name', type: 'text', required: true },
      { name: 'mfaRequired', label: 'MFA required', type: 'checkbox', description: 'MFA is enforced server-side for privileged roles.' },
      { name: 'permissionKeys', label: 'Permission keys', type: 'hidden', description: 'Permission replacement uses the role-permission matrix and explicit audited backend command.' },
    ],
    description: 'Role create/edit form using shared RBAC contracts. Permission replacement remains explicit and audited.',
  }),
  '/teams': createResourceDefinition({
    resourceKey: 'teams',
    title: 'Team',
    endpoint: '/teams',
    schema: castSchema(z.object({ departmentId: z.string().min(1), name: z.string().min(1).max(200), leadEmployeeId: z.string().nullable().optional() })),
    defaultValues: defaults({ departmentId: '', name: '', leadEmployeeId: null }),
    fields: [
      { name: 'departmentId', label: 'Department', type: 'text', required: true, description: uuidDescription },
      { name: 'name', label: 'Team name', type: 'text', required: true },
      { name: 'leadEmployeeId', label: 'Team lead', type: 'text', description: uuidDescription },
    ],
    description: 'Team form keeps team ownership under organization/department scope; backend validates employee membership and tenant boundaries.',
  }),
  '/branches': createResourceDefinition({
    resourceKey: 'branches',
    title: 'Branch',
    endpoint: '/branches',
    schema: castSchema(CreateBranchSchema),
    defaultValues: defaults({ code: '', name: '', addressId: null }),
    fields: [...commonCodeNameFields, { name: 'addressId', label: 'Address', type: 'text', description: uuidDescription }],
    description: 'Branch create/edit form using the shared organization Zod contract.',
  }),
  '/departments': createResourceDefinition({
    resourceKey: 'departments', title: 'Department', endpoint: '/departments', schema: castSchema(CreateDepartmentSchema),
    defaultValues: defaults({ branchId: '', name: '' }),
    fields: [{ name: 'branchId', label: 'Branch', type: 'text', required: true, description: uuidDescription }, { name: 'name', label: 'Department name', type: 'text', required: true }],
    description: 'Department form keeps branch ownership explicit and backend tenant scope authoritative.',
  }),
  '/employees': createResourceDefinition({
    resourceKey: 'employees', title: 'Employee', endpoint: '/employees', schema: castSchema(CreateEmployeeSchema),
    defaultValues: defaults({ employeeNo: '', name: '', branchId: '', departmentId: '', userId: null, managerId: null, jobTitle: '', joiningDate: '', employmentType: '', baseSalary: null }),
    fields: [
      { name: 'employeeNo', label: 'Employee No', type: 'text', createOnly: true, required: true }, { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'branchId', label: 'Branch', type: 'text', description: uuidDescription }, { name: 'departmentId', label: 'Department', type: 'text', description: uuidDescription },
      { name: 'jobTitle', label: 'Job title', type: 'text' }, { name: 'joiningDate', label: 'Joining date', type: 'date' },
      { name: 'employmentType', label: 'Employment type', type: 'text' }, { name: 'baseSalary', label: 'Base salary', type: 'money' },
    ],
    description: 'Employee form uses RHF defaults and shared HR master validation while leaving payroll and permissions to backend services.',
  }),
  '/customers': createResourceDefinition({
    resourceKey: 'customers', title: 'Customer', endpoint: '/customers', schema: castSchema(CreateCustomerSchema),
    defaultValues: defaults({ code: '', name: '', taxNo: '', billingAddressId: null, creditLimit: null }),
    fields: [...commonCodeNameFields, { name: 'taxNo', label: 'Tax number', type: 'text' }, { name: 'creditLimit', label: 'Credit limit', type: 'money' }],
    description: 'Customer master form uses shared customer contract; organizationId is never supplied from the browser.',
  }),
  '/customer-sites': createResourceDefinition({
    resourceKey: 'customer-sites', title: 'Customer Site', endpoint: '/customer-sites', schema: castSchema(CreateCustomerSiteSchema),
    defaultValues: defaults({ customerId: '', code: '', name: '', addressId: null }),
    fields: [{ name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, ...commonCodeNameFields, { name: 'addressId', label: 'Address', type: 'text', description: uuidDescription }],
    description: 'Customer site form connects physical locations to customer records through shared contracts.',
  }),
  '/vendors': createResourceDefinition({
    resourceKey: 'vendors', title: 'Vendor', endpoint: '/vendors', schema: castSchema(CreateVendorSchema),
    defaultValues: defaults({ code: '', name: '', taxNo: '', paymentTerms: '', billingAddressId: null }),
    fields: [...commonCodeNameFields, { name: 'taxNo', label: 'Tax number', type: 'text' }, { name: 'paymentTerms', label: 'Payment terms', type: 'textarea' }],
    description: 'Vendor form uses the shared vendor Zod contract and keeps onboarding/risk workflows separate.',
  }),
  '/products': createResourceDefinition({
    resourceKey: 'products', title: 'Product', endpoint: '/products', schema: castSchema(CreateProductSchema),
    defaultValues: defaults({ categoryId: '', sku: '', name: '', unitId: '', trackingType: 'NONE', brand: '', model: '', barcode: '', standardCost: null, salesPrice: null, minStock: null, maxStock: null }),
    fields: [
      { name: 'sku', label: 'SKU', type: 'text', createOnly: true }, { name: 'name', label: 'Product name', type: 'text' },
      { name: 'categoryId', label: 'Category', type: 'text', description: uuidDescription }, { name: 'unitId', label: 'Unit', type: 'text', description: uuidDescription },
      { name: 'trackingType', label: 'Tracking type', type: 'select', options: [{ label: 'None', value: 'NONE' }, { label: 'Serial', value: 'SERIAL' }, { label: 'Batch', value: 'BATCH' }] },
      { name: 'brand', label: 'Brand', type: 'text' }, { name: 'model', label: 'Model', type: 'text' }, { name: 'standardCost', label: 'Standard cost', type: 'money' }, { name: 'salesPrice', label: 'Sales price', type: 'money' }, { name: 'minStock', label: 'Minimum stock', type: 'quantity' },
    ],
    description: 'Product form uses inventory master validation; final stock effects remain transaction-based, not product edit side effects.',
  }),
  '/warehouses': createResourceDefinition({
    resourceKey: 'warehouses', title: 'Warehouse', endpoint: '/warehouses', schema: castSchema(CreateWarehouseSchema),
    defaultValues: defaults({ branchId: '', code: '', name: '' }),
    fields: [{ name: 'branchId', label: 'Branch', type: 'text', description: uuidDescription }, ...commonCodeNameFields],
    description: 'Warehouse form keeps branch scope explicit and leaves stock movement to transaction commands.',
  }),
  '/purchase-requests': createResourceDefinition({
    resourceKey: 'purchase-requests', title: 'Purchase Request', endpoint: '/purchase-requests', schema: castSchema(CreatePurchaseRequestRequestSchema),
    defaultValues: defaults({ projectId: '', requiredDate: '', reason: '', items: [] }),
    fields: [{ name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'requiredDate', label: 'Required date', type: 'date' }, { name: 'reason', label: 'Reason', type: 'textarea' }, { name: 'items', label: 'Purchase request items', type: 'array', description: lineItemNotice, arrayFields: purchaseRequestItemFields, emptyItem: { productId: '', quantity: '1', estimatedUnitPrice: '0.00' }, minItems: 1 }],
    description: 'Purchase request form uses shared procurement contract and submits only through Fastify /api/v1.',
    idempotent: true,
  }),
  '/rfqs': createResourceDefinition({
    resourceKey: 'rfqs', title: 'RFQ', endpoint: '/rfqs', schema: castSchema(CreateRfqSchema),
    defaultValues: defaults({ purchaseRequestId: '', closesAt: '' }),
    fields: [{ name: 'purchaseRequestId', label: 'Approved purchase request', type: 'text', description: uuidDescription }, { name: 'closesAt', label: 'Closing date/time', type: 'text' }],
    description: 'RFQ form keeps approved PR linkage visible; backend enforces eligibility and state transition.',
  }),
  '/supplier-quotations': createResourceDefinition({
    resourceKey: 'supplier-quotations', title: 'Supplier Quotation', endpoint: '/supplier-quotations', schema: castSchema(CreateSupplierQuotationSchema),
    defaultValues: defaults({ rfqId: '', vendorId: '', quoteRef: '', validity: '', items: [] }),
    fields: [{ name: 'rfqId', label: 'RFQ', type: 'text', description: uuidDescription }, { name: 'vendorId', label: 'Vendor', type: 'text', description: uuidDescription }, { name: 'quoteRef', label: 'Quote reference', type: 'text' }, { name: 'validity', label: 'Validity', type: 'date' }, { name: 'paymentTerms', label: 'Payment terms', type: 'textarea' }, { name: 'items', label: 'Supplier quotation lines', type: 'array', description: lineItemNotice, arrayFields: supplierQuotationItemFields, emptyItem: { productId: '', quantity: '1', unitPrice: '0.00', deliveryDays: 0, warrantyMonths: 0 }, minItems: 1 }],
    description: 'Supplier quotation form is RHF/Zod controlled; comparison/selection remains a command workflow.',
  }),
  '/purchase-orders': createResourceDefinition({
    resourceKey: 'purchase-orders', title: 'Purchase Order', endpoint: '/purchase-orders', schema: castSchema(CreatePurchaseOrderSchema),
    defaultValues: defaults({ supplierQuotationId: '', expectedDate: '' }),
    fields: [{ name: 'supplierQuotationId', label: 'Supplier quotation', type: 'text', required: true, description: uuidDescription }, { name: 'expectedDate', label: 'Expected date', type: 'date', required: true }],
    description: 'PO form does not approve/send/cancel; those remain explicit command dialogs.', idempotent: true,
  }),
  '/goods-receipts': createResourceDefinition({
    resourceKey: 'goods-receipts', title: 'Goods Receipt', endpoint: '/goods-receipts', schema: castSchema(ReceiveGoodsRequestSchema),
    defaultValues: defaults({ purchaseOrderId: '', warehouseId: '', receivedAt: '', items: [] }),
    fields: [{ name: 'purchaseOrderId', label: 'Purchase order', type: 'text', description: uuidDescription }, { name: 'warehouseId', label: 'Receiving warehouse', type: 'text', description: uuidDescription }, { name: 'receivedAt', label: 'Received at', type: 'text' }, { name: 'items', label: 'Received items', type: 'array', description: lineItemNotice, arrayFields: goodsReceiptItemFields, emptyItem: { purchaseOrderItemId: '', receivedQty: '1', acceptedQty: '1', damagedQty: '0', serialNumbers: [], batches: [] }, minItems: 1 }],
    description: 'GRN creation form is idempotent and backed by a PostgreSQL inventory transaction on the server.', idempotent: true,
  }),
  '/projects': createResourceDefinition({
    resourceKey: 'projects', title: 'Project', endpoint: '/projects', schema: castSchema(CreateProjectRequestSchema),
    defaultValues: defaults({ customerId: '', contractId: '', siteId: '', name: '', managerId: '', startDate: '', dueDate: '', contractValue: '0.00' }),
    fields: [{ name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'contractId', label: 'Contract', type: 'text', description: uuidDescription }, { name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'name', label: 'Project name', type: 'text' }, { name: 'managerId', label: 'Project manager', type: 'text', description: uuidDescription }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'contractValue', label: 'Contract value', type: 'money' }],
    description: 'Project form follows shared project creation contract and keeps cost/procurement workflows as commands.',
  }),
  '/project-tasks': createResourceDefinition({
    resourceKey: 'project-tasks', title: 'Project Task', endpoint: '/project-tasks', schema: castSchema(CreateProjectTaskSchema),
    defaultValues: defaults({ projectId: '', phaseId: null, assigneeId: null, title: '', status: 'NOT_STARTED', priority: 'NORMAL', startDate: null, dueDate: null, completionPct: 0, dependencyTaskIds: [] }),
    fields: [{ name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'phaseId', label: 'Phase', type: 'text', description: uuidDescription }, { name: 'title', label: 'Task title', type: 'text' }, { name: 'assigneeId', label: 'Assignee', type: 'text', description: uuidDescription }, { name: 'priority', label: 'Priority', type: 'text' }, { name: 'status', label: 'Initial status', type: 'select', options: [{ label: 'Not started', value: 'NOT_STARTED' }, { label: 'In progress', value: 'IN_PROGRESS' }, { label: 'Blocked', value: 'BLOCKED' }] }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'completionPct', label: 'Completion %', type: 'number' }, { name: 'dependencyTaskIds', label: 'Dependency task IDs JSON', type: 'json', description: 'Use a JSON UUID array for same-project dependencies. Backend rejects self or cross-project dependencies.' }],
    description: 'Project task form uses shared task schema; blocked/completed lifecycle rules remain server-authoritative.',
  }),
  '/tickets': createResourceDefinition({
    resourceKey: 'tickets', title: 'Ticket', endpoint: '/tickets', schema: castSchema(CreateTicketRequestSchema),
    defaultValues: defaults({ customerId: '', siteId: '', assetId: null, category: 'TECHNICAL_ISSUE', priority: 'MEDIUM', subject: '', description: '' }),
    fields: [{ name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'assetId', label: 'Asset', type: 'text', description: uuidDescription }, { name: 'category', label: 'Category', type: 'select', options: [{ label: 'Technical issue', value: 'TECHNICAL_ISSUE' }, { label: 'Maintenance request', value: 'MAINTENANCE_REQUEST' }, { label: 'Warranty claim', value: 'WARRANTY_CLAIM' }, { label: 'Equipment failure', value: 'EQUIPMENT_FAILURE' }] }, { name: 'priority', label: 'Priority', type: 'select', options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }] }, { name: 'subject', label: 'Subject', type: 'text' }, { name: 'description', label: 'Description', type: 'textarea' }],
    description: 'Ticket form creates support requests through Fastify; assignment/resolve/close remain command dialogs.',
  }),
  '/work-orders': createResourceDefinition({
    resourceKey: 'work-orders', title: 'Work Order', endpoint: '/work-orders', schema: castSchema(CreateWorkOrderSchema),
    defaultValues: defaults({ ticketId: '', scheduledAt: null, priority: 'MEDIUM' }),
    fields: [{ name: 'ticketId', label: 'Ticket', type: 'text', description: uuidDescription }, { name: 'scheduledAt', label: 'Scheduled at', type: 'text' }, { name: 'priority', label: 'Priority', type: 'select', options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }] }],
    description: 'Work-order form creates a field job; technician lifecycle transitions must use explicit commands.',
  }),

  '/work-orders/service-report': createResourceDefinition({
    resourceKey: 'service-report', title: 'Service Report', endpoint: '/work-orders/service-report', schema: castSchema(CreateServiceReportSchema),
    defaultValues: defaults({ arrivalAt: '', departureAt: '', workPerformed: '', rootCause: '', resolution: '', beforePhotoDocumentId: null, afterPhotoDocumentId: null, customerSignDocumentId: null, technicianSignDocumentId: null, parts: [] }),
    fields: [{ name: 'arrivalAt', label: 'Arrival time', type: 'text' }, { name: 'departureAt', label: 'Departure time', type: 'text' }, { name: 'workPerformed', label: 'Work performed', type: 'textarea' }, { name: 'rootCause', label: 'Root cause', type: 'textarea' }, { name: 'resolution', label: 'Resolution', type: 'textarea' }, { name: 'parts', label: 'Parts used', type: 'array', minItems: 0, description: 'Controlled service-report spare-part rows; backend commits stock ledger and service evidence transactionally.', emptyItem: { productId: '', qty: '1.0000', sourceWarehouseId: '', sourceLocationId: '', batches: [] }, arrayFields: [{ name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'qty', label: 'Quantity', type: 'quantity' }, { name: 'sourceWarehouseId', label: 'Source warehouse UUID', type: 'text', description: uuidDescription }, { name: 'sourceLocationId', label: 'Source location UUID', type: 'text', description: 'Optional warehouse location UUID.' }, { name: 'batches', label: 'Batch allocations JSON', type: 'json', description: 'Optional array like [{"lotNo":"LOT-001","qty":"1.0000"}].' }] }],
    description: 'Service-report contract shell for work-order scoped command forms. Real submission uses /work-orders/:id/service-report.', idempotent: true,
  }),

  '/customer-invoices': createResourceDefinition({
    resourceKey: 'customer-invoices', title: 'Customer Invoice', endpoint: '/customer-invoices', schema: castSchema(CreateCustomerInvoiceSchema),
    defaultValues: defaults({ customerId: '', projectId: null, contractId: null, issueDate: '', dueDate: '', items: [] }),
    fields: [{ name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'issueDate', label: 'Issue date', type: 'date' }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'items', label: 'Invoice items', type: 'array', minItems: 1, description: 'Controlled AR invoice lines; backend recalculates totals, tax and journal posting.', emptyItem: { productId: null, description: '', qty: '1.0000', unitPrice: '0.00', tax: '0.00' }, arrayFields: [{ name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'description', label: 'Description', type: 'text' }, { name: 'qty', label: 'Quantity', type: 'quantity' }, { name: 'unitPrice', label: 'Unit price', type: 'money' }, { name: 'tax', label: 'Tax', type: 'money' }] }],
    description: 'Invoice create form is separated from approve/post/send/cancel command dialogs.', idempotent: true,
  }),
  '/supplier-invoices': createResourceDefinition({
    resourceKey: 'supplier-invoices', title: 'Supplier Invoice', endpoint: '/supplier-invoices', schema: castSchema(CreateSupplierInvoiceSchema),
    defaultValues: defaults({ vendorId: '', purchaseOrderId: '', goodsReceiptId: '', externalInvoiceNo: '', items: [] }),
    fields: [{ name: 'vendorId', label: 'Vendor', type: 'text', description: uuidDescription }, { name: 'purchaseOrderId', label: 'Purchase order', type: 'text', description: uuidDescription }, { name: 'goodsReceiptId', label: 'GRN', type: 'text', description: uuidDescription }, { name: 'externalInvoiceNo', label: 'Supplier invoice no', type: 'text' }, { name: 'items', label: 'Invoice items', type: 'array', minItems: 1, description: 'Controlled AP invoice lines; backend three-way match compares PO, GRN and invoice line evidence.', emptyItem: { poItemId: null, description: '', qty: '1.0000', unitPrice: '0.00' }, arrayFields: [{ name: 'poItemId', label: 'PO item UUID', type: 'text', description: uuidDescription }, { name: 'description', label: 'Description', type: 'text' }, { name: 'qty', label: 'Quantity', type: 'quantity' }, { name: 'unitPrice', label: 'Unit price', type: 'money' }] }],
    description: 'Supplier invoice form supports the later three-way match command against PO and GRN.', idempotent: true,
  }),
  '/payments': createResourceDefinition({
    resourceKey: 'payments', title: 'Payment', endpoint: '/payments', schema: castSchema(CreatePaymentSchema),
    defaultValues: defaults({ direction: 'INBOUND', partyType: 'CUSTOMER', partyId: '', amount: '0.00', method: 'BANK_TRANSFER', paidAt: '', allocations: [] }),
    fields: [{ name: 'direction', label: 'Direction', type: 'select', options: [{ label: 'Inbound', value: 'INBOUND' }, { label: 'Outbound', value: 'OUTBOUND' }] }, { name: 'partyType', label: 'Party type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] }, { name: 'partyId', label: 'Party', type: 'text', description: uuidDescription }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Cash', value: 'CASH' }, { label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Card', value: 'CARD' }, { label: 'Online', value: 'ONLINE' }] }, { name: 'paidAt', label: 'Paid at', type: 'text' }, { name: 'allocations', label: 'Allocations', type: 'array', minItems: 1, description: 'Controlled payment allocation rows; backend enforces exact amount reconciliation and idempotency.', emptyItem: { invoiceType: 'CUSTOMER_INVOICE', invoiceId: '', amount: '0.00' }, arrayFields: [{ name: 'invoiceType', label: 'Invoice type', type: 'select', options: [{ label: 'Customer invoice', value: 'CUSTOMER_INVOICE' }, { label: 'Supplier invoice', value: 'SUPPLIER_INVOICE' }, { label: 'Expense', value: 'EXPENSE' }] }, { name: 'invoiceId', label: 'Invoice UUID', type: 'text', description: uuidDescription }, { name: 'amount', label: 'Allocation amount', type: 'money' }] }],
    description: 'Payment form is idempotent and never bypasses backend allocation and journal transaction rules.', idempotent: true,
  }),
  '/expenses': createResourceDefinition({
    resourceKey: 'expenses', title: 'Expense', endpoint: '/expenses', schema: castSchema(CreateExpenseSchema),
    defaultValues: defaults({ employeeId: '', projectId: null, category: '', incurredAt: '', items: [] }),
    fields: [{ name: 'employeeId', label: 'Employee', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'category', label: 'Category', type: 'text' }, { name: 'incurredAt', label: 'Incurred at', type: 'date' }, { name: 'items', label: 'Expense items', type: 'array', minItems: 1, description: 'Controlled expense detail rows; backend handles approval, finance verification and payment handoff.', emptyItem: { description: '', amount: '0.00', tax: '0.00', documentId: null }, arrayFields: [{ name: 'description', label: 'Description', type: 'text' }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'tax', label: 'Tax', type: 'money' }, { name: 'documentId', label: 'Document UUID', type: 'text', description: uuidDescription }] }],
    description: 'Expense form captures operating/project cost; manager/finance approval remains command based.',
  }),

  '/leads': createResourceDefinition({
    resourceKey: 'leads', title: 'Lead', endpoint: '/leads', schema: castSchema(CreateLeadSchema),
    defaultValues: defaults({ source: '', companyName: '', contactName: '', phone: '', email: '', requirement: '', estimatedValue: '0.00', expectedCloseDate: '' }),
    fields: [{ name: 'companyName', label: 'Company name', type: 'text' }, { name: 'contactName', label: 'Contact name', type: 'text' }, { name: 'phone', label: 'Phone', type: 'text' }, { name: 'email', label: 'Email', type: 'text' }, { name: 'requirement', label: 'Requirement', type: 'textarea' }, { name: 'estimatedValue', label: 'Estimated value', type: 'money' }, { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' }],
    description: 'Lead form uses shared CRM Zod validation and keeps qualify/convert as explicit commands.',
  }),
  '/opportunities': createResourceDefinition({
    resourceKey: 'opportunities', title: 'Opportunity', endpoint: '/opportunities', schema: castSchema(CreateOpportunitySchema),
    defaultValues: defaults({ leadId: '', customerId: '', name: '', stage: 'NEW', probabilityPct: 10, estimatedValue: '0.00', expectedCloseDate: '' }),
    fields: [{ name: 'leadId', label: 'Lead', type: 'text', description: uuidDescription }, { name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'name', label: 'Opportunity name', type: 'text' }, { name: 'stage', label: 'Stage', type: 'text' }, { name: 'probabilityPct', label: 'Probability %', type: 'number' }, { name: 'estimatedValue', label: 'Estimated value', type: 'money' }, { name: 'expectedCloseDate', label: 'Expected close date', type: 'date' }],
    description: 'Opportunity form centralizes sales-stage inputs without bypassing backend status rules.',
  }),
  '/site-surveys': createResourceDefinition({
    resourceKey: 'site-surveys', title: 'Site Survey', endpoint: '/site-surveys', schema: castSchema(CreateSiteSurveySchema),
    defaultValues: defaults({ opportunityId: '', customerId: '', siteId: '', scheduledAt: '', findings: '', estimatedEffortHours: '0' }),
    fields: [{ name: 'opportunityId', label: 'Opportunity', type: 'text', description: uuidDescription }, { name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'scheduledAt', label: 'Scheduled at', type: 'text' }, { name: 'findings', label: 'Findings', type: 'textarea' }, { name: 'estimatedEffortHours', label: 'Estimated hours', type: 'quantity' }],
    description: 'Site-survey form captures technical assessment inputs through RHF and shared CRM validation.',
  }),
  '/quotations': createResourceDefinition({
    resourceKey: 'quotations', title: 'Quotation', endpoint: '/quotations', schema: castSchema(CreateQuotationSchema),
    defaultValues: defaults({ opportunityId: '', customerId: '', siteId: '', validUntil: '', currency: 'PKR', terms: '', items: [] }),
    fields: [{ name: 'opportunityId', label: 'Opportunity', type: 'text', description: uuidDescription }, { name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'validUntil', label: 'Valid until', type: 'date' }, { name: 'currency', label: 'Currency', type: 'text' }, { name: 'terms', label: 'Terms', type: 'textarea' }, { name: 'items', label: 'Quotation items', type: 'array', minItems: 1, description: 'Controlled quotation line items; backend recalculates totals and conversion rules.', arrayFields: quotationItemFields, emptyItem: { productId: '', description: '', quantity: '1.0000', unitPrice: '0.00', taxCodeId: '' } }],
    description: 'Quotation form is structural; send/accept/expire transitions remain command dialogs.',
  }),
  '/contracts': createResourceDefinition({
    resourceKey: 'contracts', title: 'Customer Contract', endpoint: '/contracts', schema: castSchema(CreateCustomerContractSchema),
    defaultValues: defaults({ customerId: '', siteId: '', quotationId: '', title: '', startDate: '', endDate: '', billingCycle: 'MONTHLY', amount: '0.00', terms: '' }),
    fields: [{ name: 'customerId', label: 'Customer', type: 'text', description: uuidDescription }, { name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'quotationId', label: 'Quotation', type: 'text', description: uuidDescription }, { name: 'title', label: 'Title', type: 'text' }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'billingCycle', label: 'Billing cycle', type: 'select', options: [{ label: 'One time', value: 'ONE_TIME' }, { label: 'Monthly', value: 'MONTHLY' }, { label: 'Quarterly', value: 'QUARTERLY' }, { label: 'Yearly', value: 'YEARLY' }] }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'terms', label: 'Terms', type: 'textarea' }],
    description: 'Contract form uses shared CRM contract validation; activation remains an explicit command.',
  }),
  '/purchase-contracts': createResourceDefinition({
    resourceKey: 'purchase-contracts', title: 'Purchase Contract', endpoint: '/purchase-contracts', schema: castSchema(CreatePurchaseContractSchema),
    defaultValues: defaults({ vendorId: '', branchId: null, startDate: '', endDate: '', maxValue: '0.00', notes: '', items: [] }),
    fields: [{ name: 'vendorId', label: 'Vendor', type: 'text', required: true, description: uuidDescription }, { name: 'branchId', label: 'Branch', type: 'text', description: uuidDescription }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'maxValue', label: 'Maximum value', type: 'money' }, { name: 'terms', label: 'Terms JSON', type: 'json', description: 'Use JSON object for contract terms. Backend treats this as auditable commercial agreement metadata.' }, { name: 'notes', label: 'Notes', type: 'textarea' }, { name: 'items', label: 'Contract items', type: 'array', description: 'Controlled RHF item array: product, agreed rate, max quantity and/or max value. Release orders cannot exceed these balances.', arrayFields: purchaseContractItemFields, emptyItem: { productId: '', agreedRate: '0.00', maxQuantity: '', maxValue: '' }, minItems: 1 }],
    description: 'Purchase contract form supports blanket/release workflows without replacing RFQ/PO controls.',
  }),
  '/landed-costs': createResourceDefinition({
    resourceKey: 'landed-costs', title: 'Landed Cost', endpoint: '/landed-costs', schema: castSchema(CreateLandedCostSchema),
    defaultValues: defaults({ purchaseOrderId: '', goodsReceiptId: '', supplierInvoiceId: undefined, allocationMethod: 'VALUE', lines: [] }),
    fields: [{ name: 'purchaseOrderId', label: 'Purchase order', type: 'text', required: true, description: uuidDescription }, { name: 'goodsReceiptId', label: 'GRN', type: 'text', required: true, description: uuidDescription }, { name: 'supplierInvoiceId', label: 'Supplier invoice', type: 'text', description: uuidDescription }, { name: 'allocationMethod', label: 'Allocation method', type: 'select', options: [{ label: 'Value', value: 'VALUE' }, { label: 'Quantity', value: 'QUANTITY' }, { label: 'Weight', value: 'WEIGHT' }, { label: 'Manual', value: 'MANUAL' }] }, { name: 'lines', label: 'Landed cost lines', type: 'array', description: 'Controlled RHF cost array: freight, customs, insurance, handling, transport and other costs. Posting remains a backend transaction.', arrayFields: landedCostLineFields, emptyItem: { costType: 'FREIGHT', description: '', amount: '0.00', accountId: '' }, minItems: 1 }],
    description: 'Landed cost form captures cost allocation inputs; posting updates inventory/project costing transactionally.',
  }),
  '/vendor-onboarding/requests': createResourceDefinition({
    resourceKey: 'vendor-onboarding', title: 'Vendor Onboarding Request', endpoint: '/vendor-onboarding/requests', schema: castSchema(CreateVendorOnboardingRequestSchema),
    defaultValues: defaults({ vendorId: '', documentEvidence: [], bankEvidence: { verified: false }, categoryIds: [] }),
    fields: [{ name: 'vendorId', label: 'Vendor', type: 'text', required: true, description: uuidDescription }, { name: 'documentEvidence', label: 'Document evidence', type: 'array', description: 'Controlled RHF document evidence array. Approval still requires verified documents and maker-checker risk review.', arrayFields: vendorDocumentEvidenceFields, emptyItem: { documentType: '', documentId: '', verified: false, note: '' } }, { name: 'bankEvidence', label: 'Bank evidence JSON', type: 'json', description: 'Use JSON object such as {\"verified\":true,\"bankName\":\"Bank\",\"accountNoMasked\":\"****1234\"}.' }, { name: 'categoryIds', label: 'Approved category ids JSON', type: 'json', description: 'Use a JSON array of approved vendor category UUIDs. Backend persists category approval evidence.' }],
    description: 'Vendor onboarding form creates approval-controlled requests; risk/blacklist actions are command-only.',
  }),
  '/inventory/reservations': createResourceDefinition({
    resourceKey: 'inventory-reservations', title: 'Stock Reservation', endpoint: '/inventory/reservations', schema: castSchema(CreateStockReservationSchema),
    defaultValues: defaults({ productId: '', warehouseId: '', projectId: '', quantity: '0' }),
    fields: [{ name: 'productId', label: 'Product', type: 'text', description: uuidDescription }, { name: 'warehouseId', label: 'Warehouse', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'quantity', label: 'Quantity', type: 'quantity' }],
    description: 'Reservation form uses shared inventory schema and backend concurrency controls against over-reservation.', idempotent: true,
  }),
  '/inventory/transfers': createResourceDefinition({
    resourceKey: 'inventory-transfers', title: 'Stock Transfer', endpoint: '/inventory/transfers', schema: castSchema(CreateStockTransferRequestSchema),
    defaultValues: defaults({ fromWarehouseId: '', toWarehouseId: '', items: [] }),
    fields: [{ name: 'fromWarehouseId', label: 'From warehouse', type: 'text', description: uuidDescription }, { name: 'toWarehouseId', label: 'To warehouse', type: 'text', description: uuidDescription }, { name: 'items', label: 'Transfer items', type: 'array', minItems: 1, description: 'Controlled stock transfer item rows; dispatch/receive remains explicit command workflow.', arrayFields: stockTransferItemFields, emptyItem: { productId: '', quantity: '1.0000' } }],
    description: 'Transfer creation is separate from dispatch/receive command dialogs and immutable ledger posting.', idempotent: true,
  }),
  '/inventory/adjustments': createResourceDefinition({
    resourceKey: 'inventory-adjustments', title: 'Stock Adjustment', endpoint: '/inventory/adjustments', schema: castSchema(CreateStockAdjustmentSchema),
    defaultValues: defaults({ warehouseId: '', reason: '', lines: [] }),
    fields: [{ name: 'warehouseId', label: 'Warehouse', type: 'text', description: uuidDescription }, { name: 'reason', label: 'Reason', type: 'textarea' }, { name: 'lines', label: 'Adjustment lines', type: 'array', minItems: 1, description: 'Controlled stock adjustment lines; posting creates immutable ledger entries and respects approval thresholds.', arrayFields: stockAdjustmentLineFields, emptyItem: { productId: '', locationId: null, quantityDelta: '1.0000', serialNumbers: [], batches: [] } }],
    description: 'Adjustment form captures draft correction input; posting/approval thresholds remain command-controlled.',
  }),
  '/maintenance/plans': createResourceDefinition({
    resourceKey: 'maintenance-plans', title: 'Maintenance Plan', endpoint: '/maintenance/plans', schema: castSchema(CreateMaintenancePlanSchema),
    defaultValues: defaults({ assetId: '', contractId: null, name: '', frequencyType: 'MONTHS', intervalValue: 1, startAt: '', active: true, checklistId: null }),
    fields: [{ name: 'assetId', label: 'Asset', type: 'text', description: uuidDescription }, { name: 'contractId', label: 'Contract', type: 'text', description: uuidDescription }, { name: 'name', label: 'Plan name', type: 'text' }, { name: 'frequencyType', label: 'Frequency', type: 'select', options: [{ label: 'Days', value: 'DAYS' }, { label: 'Weeks', value: 'WEEKS' }, { label: 'Months', value: 'MONTHS' }, { label: 'Years', value: 'YEARS' }] }, { name: 'intervalValue', label: 'Interval', type: 'number' }, { name: 'startAt', label: 'Starts at', type: 'date' }, { name: 'active', label: 'Active', type: 'checkbox' }],
    description: 'Maintenance plan form stores deterministic scheduling inputs; generated work orders are command/job controlled.',
  }),
  '/journal-entries': createResourceDefinition({
    resourceKey: 'journal-entries', title: 'Journal Entry', endpoint: '/journal-entries', schema: castSchema(CreateJournalEntrySchema),
    defaultValues: defaults({ periodId: '', postedAt: null, referenceType: '', referenceId: null, lines: [] }),
    fields: [{ name: 'periodId', label: 'Financial period', type: 'text', description: uuidDescription }, { name: 'postedAt', label: 'Posted at', type: 'text' }, { name: 'referenceType', label: 'Reference type', type: 'text' }, { name: 'referenceId', label: 'Reference id', type: 'text', description: uuidDescription }, { name: 'lines', label: 'Journal lines', type: 'array', minItems: 2, description: 'Controlled debit/credit journal rows; backend rejects unbalanced postings.', emptyItem: { accountId: '', debit: '0.00', credit: '0.00', projectId: null, branchId: null }, arrayFields: [{ name: 'accountId', label: 'Account UUID', type: 'text', description: uuidDescription }, { name: 'debit', label: 'Debit', type: 'money' }, { name: 'credit', label: 'Credit', type: 'money' }, { name: 'projectId', label: 'Project UUID', type: 'text', description: uuidDescription }, { name: 'branchId', label: 'Branch UUID', type: 'text', description: uuidDescription }] }],
    description: 'Journal form captures draft entries only; posting is a restricted command and posted entries are reversed, not edited.', idempotent: true,
  }),
  '/stock-counts': createResourceDefinition({
    resourceKey: 'stock-counts', title: 'Stock Count', endpoint: '/stock-counts', schema: castSchema(CreateStockCountSchema),
    defaultValues: defaults({ warehouseId: '', locationId: null, plannedAt: '' }),
    fields: [{ name: 'warehouseId', label: 'Warehouse', type: 'text', description: uuidDescription }, { name: 'locationId', label: 'Location', type: 'text', description: uuidDescription }, { name: 'plannedAt', label: 'Planned at', type: 'text' }],
    description: 'Stock count form uses RHF/Zod and variance posting stays an approval-controlled command.',
  }),
  '/tax-codes': createResourceDefinition({
    resourceKey: 'tax-codes', title: 'Tax Rule', endpoint: '/tax-rules', schema: castSchema(CreateTaxRuleSchema),
    defaultValues: defaults({ code: '', name: '', rate: '0', appliesTo: 'SALES' }),
    fields: [{ name: 'code', label: 'Code', type: 'text' }, { name: 'name', label: 'Name', type: 'text' }, { name: 'rate', label: 'Rate', type: 'number' }, { name: 'appliesTo', label: 'Applies to', type: 'select', options: [{ label: 'Sales', value: 'SALES' }, { label: 'Purchase', value: 'PURCHASE' }] }],
    description: 'Tax rule form stores deterministic tax setup while transaction-time tax remains auditable.',
  }),

  '/tax/calculate': createResourceDefinition({
    resourceKey: 'tax-calculation', title: 'Tax Calculation Preview', endpoint: '/tax/calculate', schema: castSchema(TaxCalculateSchema),
    defaultValues: defaults({ sourceType: 'PREVIEW', partyType: 'OTHER', partyId: undefined, transactionDate: '', lines: [] }),
    fields: [{ name: 'sourceType', label: 'Source type', type: 'select', options: [{ label: 'Preview', value: 'PREVIEW' }, { label: 'Customer invoice', value: 'CUSTOMER_INVOICE' }, { label: 'Supplier invoice', value: 'SUPPLIER_INVOICE' }, { label: 'Purchase order', value: 'PURCHASE_ORDER' }, { label: 'Expense', value: 'EXPENSE' }] }, { name: 'partyType', label: 'Party type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] }, { name: 'transactionDate', label: 'Transaction date', type: 'date' }, { name: 'lines', label: 'Tax lines', type: 'array', minItems: 1, description: 'Controlled tax preview lines; backend stores TaxTransaction snapshot for audit.', emptyItem: { lineId: '', productId: '', description: '', quantity: '1.0000', unitPrice: '0.00', discount: '0.00', taxCodeId: '' }, arrayFields: [{ name: 'lineId', label: 'Line ref', type: 'text' }, { name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'description', label: 'Description', type: 'text' }, { name: 'quantity', label: 'Quantity', type: 'quantity' }, { name: 'unitPrice', label: 'Unit price', type: 'money' }, { name: 'discount', label: 'Discount', type: 'money' }, { name: 'taxCodeId', label: 'Tax code UUID', type: 'text', description: uuidDescription }] }],
    description: 'R15 tax preview command form uses React Hook Form and Zod; Fastify remains authoritative for tax rules and stored tax transaction evidence.', idempotent: true,
  }),
  '/bank-statements/import': createResourceDefinition({
    resourceKey: 'bank-statement-import', title: 'Bank Statement Import', endpoint: '/bank-statements/import', schema: castSchema(ImportBankStatementSchema),
    defaultValues: defaults({ bankAccountId: '', statementNo: '', periodStart: '', periodEnd: '', openingBalance: '0.00', closingBalance: '0.00', lines: [] }),
    fields: [{ name: 'bankAccountId', label: 'Bank account', type: 'text', description: uuidDescription }, { name: 'statementNo', label: 'Statement no', type: 'text' }, { name: 'periodStart', label: 'Period start', type: 'date' }, { name: 'periodEnd', label: 'Period end', type: 'date' }, { name: 'lines', label: 'Statement lines', type: 'array', minItems: 1, description: 'Controlled bank statement rows; backend keeps matching and reconciliation audit authoritative.', emptyItem: { occurredAt: '', description: '', reference: '', debit: '0.00', credit: '0.00' }, arrayFields: [{ name: 'occurredAt', label: 'Occurred at', type: 'date' }, { name: 'description', label: 'Description', type: 'text' }, { name: 'reference', label: 'Reference', type: 'text' }, { name: 'debit', label: 'Debit', type: 'money' }, { name: 'credit', label: 'Credit', type: 'money' }] }],
    description: 'R15 bank statement import command form keeps row validation, matching and reconciliation in Fastify.', idempotent: true,
  }),
  '/bank-reconciliations/:id/close': createResourceDefinition({
    resourceKey: 'bank-reconciliation-close', title: 'Close Bank Reconciliation', endpoint: '/bank-reconciliations/:id/close', schema: castSchema(CloseBankReconciliationSchema),
    defaultValues: defaults({ journalEntryIds: [], paymentIds: [], voucherIds: [], closingNote: '' }),
    fields: [{ name: 'journalEntryIds', label: 'Journal entry IDs JSON', type: 'json', description: 'Array of journal-entry UUIDs to link.' }, { name: 'paymentIds', label: 'Payment IDs JSON', type: 'json', description: 'Array of payment UUIDs to link.' }, { name: 'voucherIds', label: 'Voucher IDs JSON', type: 'json', description: 'Array of payment/receipt voucher UUIDs to link.' }, { name: 'closingNote', label: 'Closing note', type: 'textarea' }],
    description: 'R15 close reconciliation command form prevents silent edits to closed reconciliations and preserves audit policy.', idempotent: true,
  }),
  '/vouchers/payment': createResourceDefinition({
    resourceKey: 'payment-voucher', title: 'Payment Voucher', endpoint: '/vouchers/payment', schema: castSchema(PaymentVoucherSchema),
    defaultValues: defaults({ bankAccountId: '', cashAccountId: undefined, payeeType: 'VENDOR', payeeId: undefined, amount: '0.00', method: 'BANK_TRANSFER', voucherDate: '', memo: '', chequeNo: undefined }),
    fields: [{ name: 'bankAccountId', label: 'Bank account', type: 'text', description: uuidDescription }, { name: 'cashAccountId', label: 'Cash account', type: 'text', description: uuidDescription }, { name: 'payeeType', label: 'Payee type', type: 'select', options: [{ label: 'Vendor', value: 'VENDOR' }, { label: 'Customer', value: 'CUSTOMER' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] }, { name: 'payeeId', label: 'Payee UUID', type: 'text', description: uuidDescription }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Online', value: 'ONLINE' }] }, { name: 'voucherDate', label: 'Voucher date', type: 'date' }, { name: 'memo', label: 'Memo', type: 'textarea' }, { name: 'chequeNo', label: 'Cheque no', type: 'text' }],
    description: 'R15 payment voucher command form keeps bank/cash funding-account exclusivity and journal linkage backend-authoritative.', idempotent: true,
  }),
  '/vouchers/receipt': createResourceDefinition({
    resourceKey: 'receipt-voucher', title: 'Receipt Voucher', endpoint: '/vouchers/receipt', schema: castSchema(ReceiptVoucherSchema),
    defaultValues: defaults({ bankAccountId: '', cashAccountId: undefined, payerType: 'CUSTOMER', payerId: undefined, amount: '0.00', method: 'BANK_TRANSFER', voucherDate: '', memo: '', referenceNo: undefined }),
    fields: [{ name: 'bankAccountId', label: 'Bank account', type: 'text', description: uuidDescription }, { name: 'cashAccountId', label: 'Cash account', type: 'text', description: uuidDescription }, { name: 'payerType', label: 'Payer type', type: 'select', options: [{ label: 'Customer', value: 'CUSTOMER' }, { label: 'Vendor', value: 'VENDOR' }, { label: 'Employee', value: 'EMPLOYEE' }, { label: 'Other', value: 'OTHER' }] }, { name: 'payerId', label: 'Payer UUID', type: 'text', description: uuidDescription }, { name: 'amount', label: 'Amount', type: 'money' }, { name: 'method', label: 'Method', type: 'select', options: [{ label: 'Bank transfer', value: 'BANK_TRANSFER' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }, { label: 'Online', value: 'ONLINE' }] }, { name: 'voucherDate', label: 'Voucher date', type: 'date' }, { name: 'memo', label: 'Memo', type: 'textarea' }, { name: 'referenceNo', label: 'Reference no', type: 'text' }],
    description: 'Pass 15 receipt voucher command form keeps bank/cash collection-account exclusivity and journal linkage backend-authoritative.', idempotent: true,
  }),

  '/saas/plans': createResourceDefinition({
    resourceKey: 'saas-plans', title: 'SaaS Plan', endpoint: '/saas/plans', schema: castSchema(CreateSaaSPlanSchema),
    defaultValues: defaults({ key: '', name: '', moduleKeys: [], limitsJson: { userLimit: 25, storageGb: 10, moduleLimit: 10, featureLimits: {} }, active: true }),
    fields: [{ name: 'key', label: 'Plan key', type: 'text', required: true }, { name: 'name', label: 'Plan name', type: 'text', required: true }, { name: 'moduleKeys', label: 'Allowed module keys JSON', type: 'json', description: 'JSON array of enabled module keys. Backend plan guard enforces this at service level.' }, { name: 'limitsJson', label: 'Limits JSON', type: 'json', description: 'Use {"userLimit":25,"storageGb":10,"featureLimits":{}}. Limits are displayed in UI but enforced server-side.' }, { name: 'active', label: 'Active', type: 'checkbox' }],
    description: 'Pass 20 SaaS plan form uses React Hook Form/Zod and keeps module/user/storage limits platform-owner controlled.', idempotent: true,
  }),
  '/saas/subscriptions': createResourceDefinition({
    resourceKey: 'saas-subscriptions', title: 'SaaS Subscription', endpoint: '/saas/subscriptions', schema: castSchema(CreateSaaSSubscriptionSchema),
    defaultValues: defaults({ organizationId: '', planId: '', status: 'TRIAL', startsAt: '', endsAt: undefined, trialEndsAt: undefined }),
    fields: [{ name: 'organizationId', label: 'Tenant organization', type: 'text', required: true, description: uuidDescription }, { name: 'planId', label: 'SaaS plan', type: 'text', required: true, description: uuidDescription }, { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Trial', value: 'TRIAL' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Past due', value: 'PAST_DUE' }, { label: 'Suspended', value: 'SUSPENDED' }, { label: 'Cancelled', value: 'CANCELLED' }] }, { name: 'startsAt', label: 'Starts at', type: 'text', required: true }, { name: 'endsAt', label: 'Ends at', type: 'text' }, { name: 'trialEndsAt', label: 'Trial ends at', type: 'text' }],
    description: 'Pass 20 subscription form links tenant plan limits to organization. Module access remains blocked by Fastify plan guard when limits do not allow it.', idempotent: true,
  }),
  '/saas/invoices': createResourceDefinition({
    resourceKey: 'saas-invoices', title: 'SaaS Invoice', endpoint: '/saas/invoices', schema: castSchema(CreateSaaSInvoiceSchema),
    defaultValues: defaults({ organizationId: '', subscriptionId: '', invoiceNo: '', amount: '0.00', dueDate: '', memo: '' }),
    fields: [{ name: 'organizationId', label: 'Tenant organization', type: 'text', required: true, description: uuidDescription }, { name: 'subscriptionId', label: 'Subscription', type: 'text', required: true, description: uuidDescription }, { name: 'invoiceNo', label: 'Invoice no', type: 'text', required: true }, { name: 'amount', label: 'Amount', type: 'money', required: true }, { name: 'dueDate', label: 'Due date', type: 'date', required: true }, { name: 'memo', label: 'Memo', type: 'textarea' }],
    description: 'Pass 20 SaaS invoice form creates platform billing records; posting remains an explicit audited backend command.', idempotent: true,
  }),
  '/number-sequences': createResourceDefinition({
    resourceKey: 'number-sequences', title: 'Number Sequence', endpoint: '/number-sequences', schema: castSchema(CreateNumberSequenceSchema),
    defaultValues: defaults({ branchId: null, entityType: '', prefix: '', fiscalYear: 2026, startNumber: 0, padding: 5, resetPolicy: 'FISCAL_YEAR' }),
    fields: [{ name: 'entityType', label: 'Entity type', type: 'text' }, { name: 'prefix', label: 'Prefix', type: 'text' }, { name: 'padding', label: 'Padding', type: 'number' }, { name: 'resetPolicy', label: 'Reset policy', type: 'select', options: [{ label: 'Fiscal year', value: 'FISCAL_YEAR' }, { label: 'Calendar year', value: 'CALENDAR_YEAR' }, { label: 'Never', value: 'NEVER' }] }],
    description: 'Number sequence form configures business numbers; issuing numbers remains an internal backend service.',
  }),

  '/product-categories': createResourceDefinition({
    resourceKey: 'product-categories', title: 'Product Category', endpoint: '/product-categories', schema: castSchema(z.object({ code: z.string().min(1).max(50), name: z.string().min(1).max(200), parentId: z.string().nullable().optional(), description: z.string().max(1000).optional() })),
    defaultValues: defaults({ code: '', name: '', parentId: null, description: '' }),
    fields: [{ name: 'code', label: 'Code', type: 'text', required: true }, { name: 'name', label: 'Name', type: 'text', required: true }, { name: 'parentId', label: 'Parent category', type: 'text', description: uuidDescription }, { name: 'description', label: 'Description', type: 'textarea' }],
    description: 'Product category form owns taxonomy only; stock quantities remain transaction-derived.',
  }),
  '/warehouse-locations': createResourceDefinition({
    resourceKey: 'warehouse-locations', title: 'Warehouse Location', endpoint: '/warehouse-locations', schema: castSchema(z.object({ warehouseId: z.string().min(1), parentId: z.string().nullable().optional(), type: z.enum(['ZONE', 'RACK', 'SHELF', 'BIN']).default('BIN'), code: z.string().min(1).max(80), name: z.string().min(1).max(200) })),
    defaultValues: defaults({ warehouseId: '', parentId: null, type: 'BIN', code: '', name: '' }),
    fields: [{ name: 'warehouseId', label: 'Warehouse', type: 'text', required: true, description: uuidDescription }, { name: 'parentId', label: 'Parent location', type: 'text', description: uuidDescription }, { name: 'type', label: 'Type', type: 'select', options: [{ label: 'Zone', value: 'ZONE' }, { label: 'Rack', value: 'RACK' }, { label: 'Shelf', value: 'SHELF' }, { label: 'Bin', value: 'BIN' }] }, { name: 'code', label: 'Code', type: 'text', required: true }, { name: 'name', label: 'Name', type: 'text', required: true }],
    description: 'Warehouse location form manages zone/rack/shelf/bin hierarchy; backend validates warehouse tenant and branch scope.',
  }),


  '/assets': createResourceDefinition({
    resourceKey: 'assets', title: 'Asset', endpoint: '/assets', schema: castSchema(CreateAssetSchema),
    defaultValues: defaults({ productId: '', customerId: '', siteId: '', areaId: null, projectId: '', purchaseCost: null, supplierVendorId: null }),
    fields: [{ name: 'productId', label: 'Product', type: 'text', required: true, description: uuidDescription }, { name: 'customerId', label: 'Customer', type: 'text', required: true, description: uuidDescription }, { name: 'siteId', label: 'Customer site', type: 'text', required: true, description: uuidDescription }, { name: 'areaId', label: 'Site area', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', required: true, description: uuidDescription }, { name: 'purchaseCost', label: 'Purchase cost', type: 'money' }, { name: 'supplierVendorId', label: 'Supplier vendor', type: 'text', description: uuidDescription }],
    description: 'Asset form links product, customer, site and project while lifecycle status remains command-controlled.', idempotent: true,
  }),
  '/assets/register-from-stock': createResourceDefinition({
    resourceKey: 'assets-register-from-stock', title: 'Register Asset From Stock', endpoint: '/assets/register-from-stock', schema: castSchema(RegisterAssetFromStockSchema),
    defaultValues: defaults({ serialNo: '', customerId: '', siteId: '', areaId: null, projectId: '', purchaseCost: null, supplierVendorId: null }),
    fields: [{ name: 'serialNo', label: 'Serial number', type: 'text', required: true }, { name: 'customerId', label: 'Customer', type: 'text', required: true, description: uuidDescription }, { name: 'siteId', label: 'Customer site', type: 'text', required: true, description: uuidDescription }, { name: 'areaId', label: 'Site area', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', required: true, description: uuidDescription }, { name: 'purchaseCost', label: 'Purchase cost', type: 'money' }, { name: 'supplierVendorId', label: 'Supplier vendor', type: 'text', description: uuidDescription }],
    description: 'Register asset from eligible serial/stock through the locked Fastify command endpoint; backend validates serial availability and tenant scope.', idempotent: true,
  }),
  '/projects/bom': createResourceDefinition({
    resourceKey: 'project-bom', title: 'Project BOM', endpoint: '/projects/bom', schema: castSchema(UpsertProjectBomSchema),
    defaultValues: defaults({ items: [] }),
    fields: [{ name: 'items', label: 'BOM items', type: 'array', description: lineItemNotice, arrayFields: projectBomItemFields, emptyItem: { productId: '', requiredQty: '1' }, minItems: 1 }],
    description: 'Project BOM field-array shell for route-specific /projects/:id/bom workflow. Runtime pass binds project id and uses PUT instead of a duplicate business API.', idempotent: true,
  }),
  '/projects/budget': createResourceDefinition({
    resourceKey: 'project-budget', title: 'Project Budget', endpoint: '/projects/budget', schema: castSchema(UpsertProjectBudgetSchema),
    defaultValues: defaults({ lines: [] }),
    fields: [{ name: 'lines', label: 'Budget lines', type: 'array', description: lineItemNotice, arrayFields: projectBudgetLineFields, emptyItem: { category: '', budgetAmount: '0.00' }, minItems: 1 }],
    description: 'Project budget field-array shell for route-specific /projects/:id/budget workflow. Runtime pass binds project id and uses PUT with explicit approval command.', idempotent: true,
  }),
  '/projects/material-request': createResourceDefinition({
    resourceKey: 'project-material-request', title: 'Project Material Requirement', endpoint: '/projects/material-request', schema: castSchema(CreateMaterialRequirementSchema),
    defaultValues: defaults({ requestedById: '' }),
    fields: [{ name: 'requestedById', label: 'Requested by employee', type: 'text', description: uuidDescription }],
    description: 'Material requirement command shell; actual endpoint is project-scoped /projects/:id/material-request and backend calculates shortages.', idempotent: true,
  }),

} satisfies Record<string, ResourceFormDefinition<Record<string, unknown>>>;

const GenericCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(4000).optional(),
});

export function getResourceFormDefinition(endpoint: string, title: string): ResourceFormDefinition<Record<string, unknown>> {
  const cleanEndpoint = endpoint.split('?')[0] ?? endpoint;
  const normalized = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;
  return ResourceFormRegistry[normalized] ?? createResourceDefinition({
    resourceKey: normalized.replace(/^\//, '').replaceAll('/', '-'),
    title,
    endpoint: normalized,
    schema: GenericCreateSchema,
    defaultValues: { name: '', description: '' },
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'description', label: 'Description', type: 'textarea' }],
    description: 'Generic RHF/Zod form shell for routes without a dedicated module form yet. R9-R16 must replace it with module-owned field arrays and pickers.',
  });
}

export const CommandFormRegistry = {
  approvePurchaseRequest: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'approve-purchase-request', title: 'Approve purchase request', endpoint: `/purchase-requests/${id}/approve`, schema: castSchema(z.object({ comment: z.string().min(1).max(2000) })), defaultValues: { comment: '' }, fields: [{ name: 'comment', label: 'Approval comment', type: 'textarea' }], invalidateKeys: [keyFor('purchase-requests')], idempotent: true, requiredPermission: 'purchase_request.approve', irreversibleEffects: ['Creates an approval audit action.', 'May make the request eligible for RFQ creation.'],
  }),
  rejectPurchaseRequest: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'reject-purchase-request', title: 'Reject purchase request', endpoint: `/purchase-requests/${id}/reject`, schema: castSchema(z.object({ comment: z.string().min(1).max(2000) })), defaultValues: { comment: '' }, fields: [{ name: 'comment', label: 'Rejection reason', type: 'textarea' }], invalidateKeys: [keyFor('purchase-requests')], idempotent: true, requiredPermission: 'purchase_request.approve', irreversibleEffects: ['Records the rejection reason in the approval/audit timeline.'],
  }),
  receiveGoods: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'receive-goods', title: 'Receive goods', endpoint: `/goods-receipts`, schema: castSchema(ReceiveGoodsRequestSchema), defaultValues: { purchaseOrderId: id, warehouseId: '', receivedAt: '', items: [] }, fields: [{ name: 'purchaseOrderId', label: 'Purchase order', type: 'text' }, { name: 'warehouseId', label: 'Warehouse', type: 'text', description: uuidDescription }, { name: 'receivedAt', label: 'Received at', type: 'text' }, { name: 'items', label: 'Received items', type: 'array', description: lineItemNotice, arrayFields: goodsReceiptItemFields, emptyItem: { purchaseOrderItemId: '', receivedQty: '1', acceptedQty: '1', damagedQty: '0', serialNumbers: [], batches: [] }, minItems: 1 }], invalidateKeys: [keyFor('goods-receipts'), keyFor('purchase-orders')], idempotent: true, requiredPermission: 'goods_receipt.create', irreversibleEffects: ['Creates GRN, serial/batch capture, accepted quantities and immutable stock ledger entries in one backend transaction.'],
  }),
  blacklistVendor: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'blacklist-vendor', title: 'Blacklist vendor', endpoint: `/vendors/${id}/blacklist`, schema: castSchema(BlacklistVendorSchema), defaultValues: { reason: '', riskScore: 100 }, fields: [{ name: 'reason', label: 'Risk reason', type: 'textarea' }, { name: 'riskScore', label: 'Risk score', type: 'number' }], invalidateKeys: [keyFor('vendors')], idempotent: true, requiredPermission: 'vendor.risk.manage', irreversibleEffects: ['Prevents the vendor from normal RFQ/PO/payment selection without override permission.', 'Creates a high-risk audit event.'],
  }),
  assignTicket: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'assign-ticket', title: 'Assign ticket', endpoint: `/tickets/${id}/assign`, schema: castSchema(AssignTicketSchema), defaultValues: { assigneeId: '' }, fields: [{ name: 'assigneeId', label: 'Assignee', type: 'text', description: uuidDescription }], invalidateKeys: [keyFor('tickets')], idempotent: true, requiredPermission: 'ticket.assign', irreversibleEffects: ['Changes ticket assignment and creates audit/notification events.'],
  }),
  resolveTicket: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'resolve-ticket', title: 'Resolve ticket', endpoint: `/tickets/${id}/resolve`, schema: castSchema(ResolveTicketSchema), defaultValues: { resolution: '' }, fields: [{ name: 'resolution', label: 'Resolution', type: 'textarea' }], invalidateKeys: [keyFor('tickets')], idempotent: true, requiredPermission: 'ticket.resolve', irreversibleEffects: ['Moves the ticket toward customer confirmation/closure by explicit command only.'],
  }),
  closeTicket: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'close-ticket', title: 'Close ticket', endpoint: `/tickets/${id}/close`, schema: castSchema(CloseTicketSchema), defaultValues: { customerConfirmed: true, comment: '' }, fields: [{ name: 'comment', label: 'Closure comment', type: 'textarea' }], invalidateKeys: [keyFor('tickets')], idempotent: true, requiredPermission: 'ticket.resolve', irreversibleEffects: ['Closes the ticket only after backend customer-confirmation rules pass.'],
  }),
  assignWorkOrder: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'assign-work-order', title: 'Assign work order', endpoint: `/work-orders/${id}/assign`, schema: castSchema(AssignWorkOrderSchema), defaultValues: { technicianId: '', scheduledAt: null }, fields: [{ name: 'technicianId', label: 'Technician', type: 'text', description: uuidDescription }, { name: 'scheduledAt', label: 'Scheduled at', type: 'text' }], invalidateKeys: [keyFor('work-orders')], idempotent: true, requiredPermission: 'workorder.assign', irreversibleEffects: ['Notifies the assigned technician and records the assignment audit action.'],
  }),
  workOrderNoteCommand: (id: string, command: 'accept' | 'start-travel' | 'arrive' | 'start' | 'complete'): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: `work-order-${command}`, title: `Work order ${command}`, endpoint: `/work-orders/${id}/${command}`, schema: castSchema(WorkOrderCommandNoteSchema), defaultValues: { note: '' }, fields: [{ name: 'note', label: 'Note', type: 'textarea' }], invalidateKeys: [keyFor('work-orders')], idempotent: true, requiredPermission: 'workorder.update', irreversibleEffects: ['Changes the work-order lifecycle through an explicit command endpoint, not a generic status patch.'],
  }),
  projectHandover: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'project-handover', title: 'Complete project handover', endpoint: `/projects/${id}/handover`, schema: castSchema(CompleteProjectHandoverSchema), defaultValues: { acceptedByCustomerId: '', acceptedAt: '', documentId: null }, fields: [{ name: 'acceptedByCustomerId', label: 'Accepted by customer', type: 'text', description: uuidDescription }, { name: 'acceptedAt', label: 'Accepted at', type: 'text' }, { name: 'documentId', label: 'Handover document', type: 'text', description: uuidDescription }], invalidateKeys: [keyFor('projects')], idempotent: true, requiredPermission: 'project.handover', irreversibleEffects: ['Creates project handover evidence and audit trail.'],
  }),

  installAsset: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'install-asset', title: 'Install asset', endpoint: `/assets/${id}/install`, schema: castSchema(InstallAssetSchema), defaultValues: { siteId: '', areaId: null, projectId: '', technicianId: '', installedAt: '', locationText: '', checklistId: null }, fields: [{ name: 'siteId', label: 'Site', type: 'text', description: uuidDescription }, { name: 'projectId', label: 'Project', type: 'text', description: uuidDescription }, { name: 'technicianId', label: 'Technician', type: 'text', description: uuidDescription }, { name: 'installedAt', label: 'Installed at', type: 'text' }, { name: 'locationText', label: 'Location', type: 'text' }], invalidateKeys: [keyFor('assets')], idempotent: true, requiredPermission: 'asset.install', irreversibleEffects: ['Commits stock/serial movement, installation history, asset status and audit in one backend transaction.'],
  }),
  replaceAsset: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'replace-asset', title: 'Replace asset', endpoint: `/assets/${id}/replace`, schema: castSchema(ReplaceAssetSchema), defaultValues: { replacementAssetId: '', reason: '' }, fields: [{ name: 'replacementAssetId', label: 'Replacement asset', type: 'text', description: uuidDescription }, { name: 'reason', label: 'Reason', type: 'textarea' }], invalidateKeys: [keyFor('assets')], idempotent: true, requiredPermission: 'asset.replace', irreversibleEffects: ['Links old and new asset history without destructive editing.'],
  }),
  retireAsset: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'retire-asset', title: 'Retire asset', endpoint: `/assets/${id}/retire`, schema: castSchema(RetireAssetSchema), defaultValues: { reason: '' }, fields: [{ name: 'reason', label: 'Retirement reason', type: 'textarea' }], invalidateKeys: [keyFor('assets')], idempotent: true, requiredPermission: 'asset.retire', irreversibleEffects: ['Retires the asset through explicit audited lifecycle command.'],
  }),
  rotateAssetQr: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'rotate-asset-qr', title: 'Rotate asset QR', endpoint: `/assets/${id}/qr/rotate`, schema: castSchema(RotateAssetQrSchema), defaultValues: { ttlDays: 365 }, fields: [{ name: 'ttlDays', label: 'Token lifetime days', type: 'number' }], invalidateKeys: [keyFor('assets')], idempotent: true, requiredPermission: 'asset.manage_qr', irreversibleEffects: ['Revokes old QR token and creates a new authorized lookup token.'],
  }),
  createAssetRma: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'create-asset-rma', title: 'Create asset RMA', endpoint: `/assets/${id}/rma`, schema: castSchema(CreateAssetRmaSchema), defaultValues: { vendorId: '', reason: '' }, fields: [{ name: 'vendorId', label: 'Vendor', type: 'text', description: uuidDescription }, { name: 'reason', label: 'RMA reason', type: 'textarea' }], invalidateKeys: [keyFor('assets')], idempotent: true, requiredPermission: 'asset.rma', irreversibleEffects: ['Creates supplier return evidence against the asset lifecycle.'],
  }),
  createMaterialRequirement: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'create-material-request', title: 'Create material requirement', endpoint: `/projects/${id}/material-request`, schema: castSchema(CreateMaterialRequirementSchema), defaultValues: { requestedById: '' }, fields: [{ name: 'requestedById', label: 'Requested by employee', type: 'text', description: uuidDescription }], invalidateKeys: [keyFor('projects')], idempotent: true, requiredPermission: 'project.update', irreversibleEffects: ['Creates project material demand from approved BOM shortages through backend transaction boundaries.'],
  }),

  createServiceReport: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'create-service-report', title: 'Create service report', endpoint: `/work-orders/${id}/service-report`, schema: castSchema(CreateServiceReportSchema), defaultValues: { arrivalAt: '', departureAt: '', workPerformed: '', rootCause: '', resolution: '', beforePhotoDocumentId: null, afterPhotoDocumentId: null, customerSignDocumentId: null, technicianSignDocumentId: null, parts: [] }, fields: [{ name: 'arrivalAt', label: 'Arrival time', type: 'text' }, { name: 'departureAt', label: 'Departure time', type: 'text' }, { name: 'workPerformed', label: 'Work performed', type: 'textarea' }, { name: 'rootCause', label: 'Root cause', type: 'textarea' }, { name: 'resolution', label: 'Resolution', type: 'textarea' }, { name: 'parts', label: 'Parts used', type: 'array', minItems: 0, description: 'Controlled service-report spare-part rows; backend commits parts usage through field-service and inventory transaction rules.', emptyItem: { productId: '', qty: '1.0000', sourceWarehouseId: '', sourceLocationId: '', batches: [] }, arrayFields: [{ name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'qty', label: 'Quantity', type: 'quantity' }, { name: 'sourceWarehouseId', label: 'Source warehouse UUID', type: 'text', description: uuidDescription }, { name: 'sourceLocationId', label: 'Source location UUID', type: 'text', description: 'Optional warehouse location UUID.' }, { name: 'batches', label: 'Batch allocations JSON', type: 'json', description: 'Optional array like [{"lotNo":"LOT-001","qty":"1.0000"}].' }] }], invalidateKeys: [keyFor('work-orders')], idempotent: true, requiredPermission: 'workorder.update', irreversibleEffects: ['Creates service report evidence and queues PDF/notification after commit.'],
  }),
  generateMaintenanceWorkOrder: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'generate-maintenance-work-order', title: 'Generate maintenance work order', endpoint: `/maintenance/schedules/${id}/generate-work-order`, schema: castSchema(GenerateMaintenanceWorkOrderSchema), defaultValues: { idempotencyKey: '' }, fields: [{ name: 'idempotencyKey', label: 'Optional idempotency key', type: 'text' }], invalidateKeys: [keyFor('maintenance/schedule')], idempotent: true, requiredPermission: 'maintenance.execute', irreversibleEffects: ['Creates or returns one generated work order for the due schedule.'],
  }),
  completeMaintenanceExecution: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'complete-maintenance-execution', title: 'Complete maintenance execution', endpoint: `/maintenance/executions/${id}/complete`, schema: castSchema(CompleteMaintenanceExecutionSchema), defaultValues: { result: 'PASSED', completedAt: '', notes: '', parts: [] }, fields: [{ name: 'result', label: 'Result', type: 'select', options: [{ label: 'Passed', value: 'PASSED' }, { label: 'Repaired', value: 'REPAIRED' }, { label: 'Failed', value: 'FAILED' }, { label: 'Replaced', value: 'REPLACED' }] }, { name: 'completedAt', label: 'Completed at', type: 'text' }, { name: 'notes', label: 'Notes', type: 'textarea' }, { name: 'parts', label: 'Parts used', type: 'array', minItems: 0, description: 'Controlled maintenance spare-part rows; backend commits stock ledger, asset history, next schedule and warranty/RMA review evidence transactionally.', emptyItem: { productId: '', qty: '1.0000', sourceWarehouseId: '', sourceLocationId: '', batches: [] }, arrayFields: [{ name: 'productId', label: 'Product UUID', type: 'text', description: uuidDescription }, { name: 'qty', label: 'Quantity', type: 'quantity' }, { name: 'sourceWarehouseId', label: 'Source warehouse UUID', type: 'text', description: uuidDescription }, { name: 'sourceLocationId', label: 'Source location UUID', type: 'text', description: 'Optional warehouse location UUID.' }, { name: 'batches', label: 'Batch allocations JSON', type: 'json', description: 'Optional array like [{"lotNo":"LOT-001","qty":"1.0000"}].' }] }], invalidateKeys: [keyFor('maintenance/schedule')], idempotent: true, requiredPermission: 'maintenance.execute', irreversibleEffects: ['Commits maintenance result, parts usage, next due schedule and asset history where required.'],
  }),
  technicianCheckIn: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'technician-check-in', title: 'Technician check-in', endpoint: `/work-orders/${id}/check-in`, schema: castSchema(TechnicianCheckInSchema), defaultValues: { capturedAt: '', latitude: undefined, longitude: undefined, photoDocumentId: null }, fields: [{ name: 'capturedAt', label: 'Captured at', type: 'text' }, { name: 'latitude', label: 'Latitude', type: 'number' }, { name: 'longitude', label: 'Longitude', type: 'number' }, { name: 'photoDocumentId', label: 'Photo proof document', type: 'text', description: uuidDescription }], invalidateKeys: [keyFor('work-orders')], idempotent: true, requiredPermission: 'workorder.update', irreversibleEffects: ['Records visit proof using tenant privacy policy.'],
  }),
  technicianCheckOut: (id: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'technician-check-out', title: 'Technician check-out', endpoint: `/work-orders/${id}/check-out`, schema: castSchema(TechnicianCheckOutSchema), defaultValues: { capturedAt: '', latitude: undefined, longitude: undefined, photoDocumentId: null, customerSignDocumentId: null }, fields: [{ name: 'capturedAt', label: 'Captured at', type: 'text' }, { name: 'customerSignDocumentId', label: 'Customer signature document', type: 'text', description: uuidDescription }], invalidateKeys: [keyFor('work-orders')], idempotent: true, requiredPermission: 'workorder.update', irreversibleEffects: ['Records checkout/signature evidence without exposing raw storage credentials.'],
  }),
  technicianOfflineSync: (): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: 'technician-offline-sync', title: 'Technician offline sync', endpoint: '/portal/technician/offline-sync', schema: castSchema(TechnicianOfflineSyncBatchSchema), defaultValues: { deviceId: '', clientBatchId: '', tenantClockAt: '', commands: [] }, fields: [{ name: 'deviceId', label: 'Device', type: 'text' }, { name: 'clientBatchId', label: 'Batch', type: 'text' }, { name: 'tenantClockAt', label: 'Tenant clock at', type: 'text' }, { name: 'commands', label: 'Offline commands', type: 'array', minItems: 1, description: 'Controlled technician offline command queue; backend enforces tenant, technician, idempotency and conflict rules.', arrayFields: technicianOfflineCommandFields, emptyItem: { clientCommandId: '', workOrderId: '', type: 'STATUS_CHANGE', occurredAt: '', payload: {} } }], invalidateKeys: [keyFor('portal/technician/jobs')], idempotent: true, requiredPermission: 'workorder.update', irreversibleEffects: ['Replays offline commands with tenant, technician, idempotency and conflict checks.'],
  }),

  empty: (endpoint: string, title: string): CommandFormDefinition<Record<string, unknown>> => ({
    commandKey: title.toLowerCase().replaceAll(' ', '-'), title, endpoint, schema: castSchema(EmptyCommandSchema), defaultValues: {}, fields: [], invalidateKeys: [createNexoraQueryKey('command', endpoint)], idempotent: true, irreversibleEffects: ['Backend service enforces allowed state transition, tenant/branch scope and audit.'],
  }),
} as const;

export const R8FormCoverage = {
  resourceDefinitions: Object.keys(ResourceFormRegistry),
  commandDefinitions: Object.keys(CommandFormRegistry),
  standard: 'React Hook Form + @hookform/resolvers/zod + shared browser-safe Zod contracts + TanStack Query mutations + centralized Fastify API client',
} as const;
