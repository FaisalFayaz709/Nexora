# M7 executable runtime scenarios to run locally

After M1-M6 are fully certified locally, M7 must be promoted from source preflight to runtime certification by executing real API/database tests:

1. Create two organizations and two branch scopes.
2. Create employees, customers, customer sites, vendors, products, and warehouses under Organization A.
3. Attempt to list/read/update those records from Organization B and assert 404/403 with no data leakage.
4. Attempt to update immutable business keys: employeeNo, customer code, customer-site code, vendor code, product SKU, warehouse code.
5. Validate foreign keys cannot cross tenants: branch, department, linked user, manager, customer, address, vendor address, product category, unit, warehouse branch.
6. Validate create/update emits business audit rows.
7. Validate import template baseline rows exist for all M7 subjects.
8. Validate frontend pages can list the records without manual UUID entry for normal navigation.

This file is intentionally a runtime scenario checklist, not a fake pass certificate.
