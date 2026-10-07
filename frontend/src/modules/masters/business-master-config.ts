import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from './columns';

export type BusinessMasterKey = 'employees' | 'customers' | 'customer-sites' | 'vendors' | 'products' | 'warehouses';

export type BusinessMasterRelatedPanel = {
  title: string;
  description: string;
  endpoint?: string;
};

export type BusinessMasterConfig = {
  key: BusinessMasterKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  ownerModule: 'hr' | 'customers' | 'vendors' | 'inventory';
  viewPermission: PermissionKey;
  createPermission: PermissionKey;
  updatePermission: PermissionKey;
  description: string;
  columns: EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly BusinessMasterRelatedPanel[];
  importSubject: 'EMPLOYEE' | 'CUSTOMER' | 'VENDOR' | 'PRODUCT' | 'WAREHOUSE';
};

export const BusinessMasterConfigs = {
  employees: {
    key: 'employees',
    title: 'Employees',
    singularTitle: 'Employee',
    routeBase: '/employees',
    endpoint: '/employees',
    ownerModule: 'hr',
    viewPermission: 'employee.view',
    createPermission: 'employee.create',
    updatePermission: 'employee.update',
    description: 'Employee master records with branch, department, manager, job, employment status, documents, skills and HR links.',
    columns: [
      { key: 'employeeNo', label: 'Employee #' },
      { key: 'name', label: 'Name' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'branchId', label: 'Branch' },
      { key: 'departmentId', label: 'Department' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['employeeNo', 'name', 'status', 'jobTitle'],
    profileFields: ['branchId', 'departmentId', 'managerId', 'userId', 'joiningDate', 'employmentType', 'baseSalary', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Documents and certifications', description: 'Employee files, certifications, expiry evidence and HR document links are exposed through the Documents module.' },
      { title: 'Attendance and leave', description: 'Attendance, leave balances and payroll records remain linked by employeeId and are completed in HR/finance workflow passes.' },
      { title: 'Audit and status history', description: 'Create/update/suspension events are displayed from audit logs; backend services remain authoritative for mutations.' },
    ],
    importSubject: 'EMPLOYEE',
  },
  customers: {
    key: 'customers',
    title: 'Customers',
    singularTitle: 'Customer',
    routeBase: '/customers',
    endpoint: '/customers',
    ownerModule: 'customers',
    viewPermission: 'customer.view',
    createPermission: 'customer.create',
    updatePermission: 'customer.update',
    description: 'Customer master records connected to contacts, sites, projects, contracts, assets, tickets, invoices, payments and documents.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'taxNo', label: 'Tax No' },
      { key: 'creditLimit', label: 'Credit limit' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'status', 'taxNo'],
    profileFields: ['creditLimit', 'billingAddressId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Customer timeline', description: 'Activity timeline from /customers/:id/timeline links sales, projects, invoices, assets and service events.', endpoint: '/customers/:id/timeline' },
      { title: 'Contacts and sites', description: 'Customer contacts and service sites provide the physical lifecycle path for projects, assets, tickets and work orders.' },
      { title: 'Finance and documents', description: 'Invoices, payments, contracts and document links are read from their owning modules and are not duplicated in the customer form.' },
    ],
    importSubject: 'CUSTOMER',
  },
  'customer-sites': {
    key: 'customer-sites',
    title: 'Customer Sites',
    singularTitle: 'Customer Site',
    routeBase: '/customer-sites',
    endpoint: '/customer-sites',
    ownerModule: 'customers',
    viewPermission: 'customer_site.view',
    createPermission: 'customer_site.create',
    updatePermission: 'customer_site.update',
    description: 'Customer physical locations used by project delivery, asset installation, tickets, work orders and maintenance schedules.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'customerId', label: 'Customer' },
      { key: 'addressId', label: 'Address' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'status', 'customerId'],
    profileFields: ['addressId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Assets at this site', description: 'Site assets are loaded from /customer-sites/:id/assets and remain permission-filtered.', endpoint: '/customer-sites/:id/assets' },
      { title: 'Buildings and areas', description: 'Building/floor/room hierarchy anchors installed assets and technician work locations.' },
      { title: 'Tickets and service history', description: 'Tickets and work orders are linked by siteId but owned by the service module.' },
    ],
    importSubject: 'CUSTOMER',
  },
  vendors: {
    key: 'vendors',
    title: 'Vendors',
    singularTitle: 'Vendor',
    routeBase: '/vendors',
    endpoint: '/vendors',
    ownerModule: 'vendors',
    viewPermission: 'vendor.view',
    createPermission: 'vendor.create',
    updatePermission: 'vendor.update',
    description: 'Vendor master records connected to onboarding, contacts, approved products, RFQs, purchase orders, invoices, payments and risk controls.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'taxNo', label: 'Tax No' },
      { key: 'paymentTerms', label: 'Payment terms' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'status', 'taxNo'],
    profileFields: ['paymentTerms', 'billingAddressId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Performance', description: 'Vendor metrics are retrieved from /vendors/:id/performance and drive procurement governance.', endpoint: '/vendors/:id/performance' },
      { title: 'Purchase orders', description: 'Vendor purchase history is loaded from /vendors/:id/purchase-orders through the procurement permission scope.', endpoint: '/vendors/:id/purchase-orders' },
      { title: 'Onboarding and risk', description: 'Vendor approval, document verification, blacklisting and risk overrides stay in explicit command workflows.' },
    ],
    importSubject: 'VENDOR',
  },
  products: {
    key: 'products',
    title: 'Products',
    singularTitle: 'Product',
    routeBase: '/products',
    endpoint: '/products',
    ownerModule: 'inventory',
    viewPermission: 'product.view',
    createPermission: 'product.create',
    updatePermission: 'product.update',
    description: 'Product master records for SKU, category, unit, tracking type, cost/price metadata and stock-control thresholds.',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'trackingType', label: 'Tracking' },
      { key: 'standardCost', label: 'Standard cost' },
      { key: 'salesPrice', label: 'Sales price' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['sku', 'name', 'status', 'trackingType'],
    profileFields: ['categoryId', 'unitId', 'brand', 'model', 'barcode', 'standardCost', 'salesPrice', 'minStock', 'maxStock', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Stock balances and ledger', description: 'Inventory movement is transaction-based; product edits never directly change stock quantities.' },
      { title: 'Serial and batch history', description: 'Serialized and lot-tracked units are viewed through inventory serial/batch records.' },
      { title: 'Vendor products', description: 'Approved vendor-product links keep sourcing history separate from product master data.' },
    ],
    importSubject: 'PRODUCT',
  },
  warehouses: {
    key: 'warehouses',
    title: 'Warehouses',
    singularTitle: 'Warehouse',
    routeBase: '/warehouses',
    endpoint: '/warehouses',
    ownerModule: 'inventory',
    viewPermission: 'warehouse.view',
    createPermission: 'warehouse.create',
    updatePermission: 'warehouse.update',
    description: 'Warehouse master records for branch-scoped stock locations, warehouse hierarchy, balances, transfers and inventory controls.',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'branchId', label: 'Branch' },
      { key: 'status', label: 'Status' },
    ],
    identityFields: ['code', 'name', 'status', 'branchId'],
    profileFields: ['addressId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Locations', description: 'Zone/rack/shelf/bin hierarchy supports warehouse balances and transaction ledger entries.' },
      { title: 'Stock balances', description: 'Current balances and reservations are read from inventory endpoints, never derived in the UI.' },
      { title: 'Stock counts', description: 'Cycle counts, variance approvals and posting are delivered through the inventory stock-count workflow.' },
    ],
    importSubject: 'WAREHOUSE',
  },
} satisfies Record<BusinessMasterKey, BusinessMasterConfig>;

export const BusinessMasterKeys = Object.keys(BusinessMasterConfigs) as BusinessMasterKey[];

export function getBusinessMasterConfig(key: BusinessMasterKey): BusinessMasterConfig {
  return BusinessMasterConfigs[key];
}
