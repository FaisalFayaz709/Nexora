# Source Boundary / Implementation Choices

## Source-derived requirements preserved

- Employee profiles include employee ID, name, branch, department, job title, manager, joining date, employment type, contact information, emergency contact, bank information, documents, certifications, skills and status.
- Customer profiles connect to contacts/sites and the site hierarchy supports Site -> Building -> Floor/Room/Area -> Assets.
- Vendor profiles include supplier code, company, contacts, products and rule-based performance information.
- Product masters include category, brand, model, SKU, barcode, serial tracking, unit, cost, sales price and min/max stock.
- Warehouse locations support Warehouse -> Zone -> Rack -> Shelf -> Bin.
- Number sequences are scoped by organization, branch, entity type, year and reset policy and must be transaction-safe.
- NumberSequence and NumberSequenceReservation are required entities.
- Business-master import templates are required for employees, customers, vendors, products and warehouses.
- Number sequence configuration is restricted; number issuing is internal service logic.

## Implementation-derived choices documented rather than misrepresented as source text

- `branchScopeKey` is a supporting NumberSequence field used to enforce a unique organization-scope row even though `branchId` is nullable. The source `branchId` remains present.
- The configured `prefix` is treated as the entire literal prefix, e.g. `PR-2026-`.
- Manual reset sets the counter to zero and requires an audit reason; fiscal-year rollover is represented by a separate fiscal-year sequence row.
- `Skill` and `EmployeeTeam` are supporting physical entities required to realize source relationships that name `skillId` and Team M:N Employee but do not name those support tables.
- Employee/customer/vendor/product/warehouse payloads are implementation-derived from the functional/entity catalog unless an exact source contract exists. The source-printed `CreateCustomerSchema` remains unchanged.
- Employee document UUIDs remain deferred references until the Document physical model enters the schema.
