-- NEXORA ERP Pass 5 — Number Sequence + Business Masters

CREATE TABLE "Skill" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Skill_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Skill_organizationId_name_key" UNIQUE ("organizationId","name")
);

CREATE TABLE "Employee" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "userId" UUID,
  "branchId" UUID NOT NULL, "departmentId" UUID NOT NULL, "employeeNo" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL, "managerId" UUID, "jobTitle" VARCHAR(160), "joiningDate" DATE,
  "employmentType" VARCHAR(80), "contactJson" JSONB, "emergencyContactJson" JSONB,
  "bankInformationJson" JSONB, "photographDocumentId" UUID, "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Employee_organizationId_employeeNo_key" UNIQUE ("organizationId","employeeNo"),
  CONSTRAINT "Employee_organizationId_userId_key" UNIQUE ("organizationId","userId")
);
CREATE TABLE "EmployeeSkill" (
  "employeeId" UUID NOT NULL, "skillId" UUID NOT NULL, "proficiency" VARCHAR(80) NOT NULL,
  CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("employeeId","skillId")
);
CREATE TABLE "EmployeeCertification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "employeeId" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "issuedAt" DATE, "expiresAt" DATE, "documentId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmployeeTeam" (
  "employeeId" UUID NOT NULL, "teamId" UUID NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeTeam_pkey" PRIMARY KEY ("employeeId","teamId")
);

CREATE TABLE "Customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL, "taxNo" VARCHAR(80), "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "creditLimit" DECIMAL(18,2), "billingAddressId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_organizationId_code_key" UNIQUE ("organizationId","code")
);
CREATE TABLE "CustomerContact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "customerId" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "email" VARCHAR(320), "phone" VARCHAR(80), "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerSite" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "customerId" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL, "name" VARCHAR(200) NOT NULL, "addressId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerSite_organizationId_code_key" UNIQUE ("organizationId","code")
);
CREATE TABLE "SiteBuilding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "customerSiteId" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteBuilding_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SiteArea" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "buildingId" UUID NOT NULL, "parentAreaId" UUID,
  "name" VARCHAR(200) NOT NULL, "areaType" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vendor" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL, "taxNo" VARCHAR(80), "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "paymentTerms" VARCHAR(200), "billingAddressId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vendor_organizationId_code_key" UNIQUE ("organizationId","code")
);
CREATE TABLE "VendorContact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "vendorId" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "email" VARCHAR(320), "phone" VARCHAR(80), "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VendorPerformance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "vendorId" UUID NOT NULL, "period" VARCHAR(40) NOT NULL,
  "onTimePct" DECIMAL(7,4), "rejectPct" DECIMAL(7,4), "score" DECIMAL(7,4), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorPerformance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VendorPerformance_vendorId_period_key" UNIQUE ("vendorId","period")
);

CREATE TABLE "ProductCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "parentId" UUID, "name" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCategory_organizationId_name_key" UNIQUE ("organizationId","name")
);
CREATE TABLE "UnitOfMeasure" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL, "precision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnitOfMeasure_organizationId_code_key" UNIQUE ("organizationId","code")
);
CREATE TABLE "Product" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "categoryId" UUID NOT NULL,
  "sku" VARCHAR(80) NOT NULL, "name" VARCHAR(200) NOT NULL, "unitId" UUID NOT NULL, "trackingType" VARCHAR(50) NOT NULL,
  "brand" VARCHAR(120), "model" VARCHAR(120), "barcode" VARCHAR(120), "standardCost" DECIMAL(18,4),
  "salesPrice" DECIMAL(18,2), "minStock" DECIMAL(18,4), "maxStock" DECIMAL(18,4),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_organizationId_sku_key" UNIQUE ("organizationId","sku")
);
CREATE TABLE "VendorProduct" (
  "vendorId" UUID NOT NULL, "productId" UUID NOT NULL, "vendorSku" VARCHAR(120), "leadTimeDays" INTEGER, "lastPrice" DECIMAL(18,4),
  CONSTRAINT "VendorProduct_pkey" PRIMARY KEY ("vendorId","productId")
);

CREATE TABLE "Warehouse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL, "name" VARCHAR(200) NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id"), CONSTRAINT "Warehouse_organizationId_code_key" UNIQUE ("organizationId","code")
);
CREATE TABLE "WarehouseLocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "warehouseId" UUID NOT NULL, "parentId" UUID, "type" VARCHAR(50) NOT NULL,
  "code" VARCHAR(50) NOT NULL, "name" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id"), CONSTRAINT "WarehouseLocation_warehouseId_code_key" UNIQUE ("warehouseId","code")
);

CREATE TABLE "ImportTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "subjectType" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL, "columnsJson" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportTemplate_organizationId_subjectType_name_key" UNIQUE ("organizationId","subjectType","name")
);

CREATE TABLE "NumberSequence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID, "branchScopeKey" VARCHAR(64) NOT NULL,
  "entityType" VARCHAR(100) NOT NULL, "prefix" VARCHAR(80) NOT NULL, "fiscalYear" INTEGER NOT NULL,
  "currentNumber" BIGINT NOT NULL DEFAULT 0, "padding" INTEGER NOT NULL, "resetPolicy" VARCHAR(80) NOT NULL,
  "lockedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NumberSequence_scope_key" UNIQUE ("organizationId","branchScopeKey","entityType","fiscalYear")
);
CREATE TABLE "NumberSequenceReservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sequenceId" UUID NOT NULL, "organizationId" UUID NOT NULL, "branchId" UUID,
  "reservedNumber" BIGINT NOT NULL, "businessNumber" VARCHAR(160) NOT NULL, "targetType" VARCHAR(100) NOT NULL, "targetId" UUID,
  "status" VARCHAR(40) NOT NULL DEFAULT 'RESERVED', "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "consumedAt" TIMESTAMPTZ(6),
  CONSTRAINT "NumberSequenceReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NumberSequenceReservation_sequenceId_reservedNumber_key" UNIQUE ("sequenceId","reservedNumber"),
  CONSTRAINT "NumberSequenceReservation_organizationId_businessNumber_key" UNIQUE ("organizationId","businessNumber")
);

CREATE INDEX "Employee_organizationId_branchId_status_idx" ON "Employee"("organizationId","branchId","status");
CREATE INDEX "Employee_organizationId_departmentId_status_idx" ON "Employee"("organizationId","departmentId","status");
CREATE INDEX "Employee_organizationId_managerId_idx" ON "Employee"("organizationId","managerId");
CREATE INDEX "EmployeeSkill_skillId_idx" ON "EmployeeSkill"("skillId");
CREATE INDEX "EmployeeCertification_employeeId_expiresAt_idx" ON "EmployeeCertification"("employeeId","expiresAt");
CREATE INDEX "EmployeeTeam_teamId_idx" ON "EmployeeTeam"("teamId");
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId","name");
CREATE INDEX "Customer_organizationId_status_idx" ON "Customer"("organizationId","status");
CREATE INDEX "CustomerContact_customerId_isPrimary_idx" ON "CustomerContact"("customerId","isPrimary");
CREATE INDEX "CustomerSite_organizationId_customerId_idx" ON "CustomerSite"("organizationId","customerId");
CREATE INDEX "SiteBuilding_customerSiteId_name_idx" ON "SiteBuilding"("customerSiteId","name");
CREATE INDEX "SiteArea_buildingId_parentAreaId_idx" ON "SiteArea"("buildingId","parentAreaId");
CREATE INDEX "Vendor_organizationId_name_idx" ON "Vendor"("organizationId","name");
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId","status");
CREATE INDEX "VendorContact_vendorId_isPrimary_idx" ON "VendorContact"("vendorId","isPrimary");
CREATE INDEX "VendorPerformance_vendorId_createdAt_idx" ON "VendorPerformance"("vendorId","createdAt");
CREATE INDEX "ProductCategory_organizationId_parentId_idx" ON "ProductCategory"("organizationId","parentId");
CREATE INDEX "UnitOfMeasure_organizationId_name_idx" ON "UnitOfMeasure"("organizationId","name");
CREATE INDEX "Product_organizationId_categoryId_name_idx" ON "Product"("organizationId","categoryId","name");
CREATE INDEX "Product_organizationId_barcode_idx" ON "Product"("organizationId","barcode");
CREATE INDEX "VendorProduct_productId_idx" ON "VendorProduct"("productId");
CREATE INDEX "Warehouse_organizationId_branchId_status_idx" ON "Warehouse"("organizationId","branchId","status");
CREATE INDEX "WarehouseLocation_warehouseId_parentId_idx" ON "WarehouseLocation"("warehouseId","parentId");
CREATE INDEX "ImportTemplate_organizationId_subjectType_active_idx" ON "ImportTemplate"("organizationId","subjectType","active");
CREATE INDEX "NumberSequence_organizationId_entityType_fiscalYear_idx" ON "NumberSequence"("organizationId","entityType","fiscalYear");
CREATE INDEX "NumberSequence_organizationId_branchId_entityType_fiscalYear_idx" ON "NumberSequence"("organizationId","branchId","entityType","fiscalYear");
CREATE INDEX "NumberSequenceReservation_organizationId_targetType_targetId_idx" ON "NumberSequenceReservation"("organizationId","targetType","targetId");
CREATE INDEX "NumberSequenceReservation_organizationId_status_createdAt_idx" ON "NumberSequenceReservation"("organizationId","status","createdAt");

ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeTeam" ADD CONSTRAINT "EmployeeTeam_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeTeam" ADD CONSTRAINT "EmployeeTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSite" ADD CONSTRAINT "CustomerSite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerSite" ADD CONSTRAINT "CustomerSite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerSite" ADD CONSTRAINT "CustomerSite_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteBuilding" ADD CONSTRAINT "SiteBuilding_customerSiteId_fkey" FOREIGN KEY ("customerSiteId") REFERENCES "CustomerSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteArea" ADD CONSTRAINT "SiteArea_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "SiteBuilding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteArea" ADD CONSTRAINT "SiteArea_parentAreaId_fkey" FOREIGN KEY ("parentAreaId") REFERENCES "SiteArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorPerformance" ADD CONSTRAINT "VendorPerformance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorProduct" ADD CONSTRAINT "VendorProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorProduct" ADD CONSTRAINT "VendorProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NumberSequence" ADD CONSTRAINT "NumberSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NumberSequence" ADD CONSTRAINT "NumberSequence_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NumberSequenceReservation" ADD CONSTRAINT "NumberSequenceReservation_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "NumberSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NumberSequenceReservation" ADD CONSTRAINT "NumberSequenceReservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NumberSequenceReservation" ADD CONSTRAINT "NumberSequenceReservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
