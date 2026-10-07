-- NEXORA ERP Pass 17 - HR
-- Core §9: Employees, Attendance, Leave and Payroll.

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "baseSalary" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "allowancesJson" JSONB;

CREATE TABLE "Attendance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "workDate" DATE NOT NULL,
  "checkIn" TIMESTAMPTZ(6),
  "checkOut" TIMESTAMPTZ(6),
  "method" VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  "status" VARCHAR(40) NOT NULL,
  "hours" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "overtimeHours" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attendance_employeeId_workDate_key" UNIQUE ("employeeId","workDate"),
  CONSTRAINT "Attendance_status_check" CHECK ("status" IN ('PRESENT','ABSENT','LATE','HALF_DAY','REMOTE','ON_SITE','LEAVE','HOLIDAY')),
  CONSTRAINT "Attendance_method_check" CHECK ("method" IN ('MANUAL','CHECK_IN_OUT','QR','MOBILE','IMPORT')),
  CONSTRAINT "Attendance_hours_check" CHECK ("hours" >= 0 AND "overtimeHours" >= 0),
  CONSTRAINT "Attendance_checkout_check" CHECK ("checkOut" IS NULL OR "checkIn" IS NULL OR "checkOut" >= "checkIn")
);

CREATE TABLE "LeaveType" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "annualAllowance" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "paid" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveType_organizationId_name_key" UNIQUE ("organizationId","name"),
  CONSTRAINT "LeaveType_allowance_check" CHECK ("annualAllowance" >= 0)
);

CREATE TABLE "LeaveBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "leaveTypeId" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "opening" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "used" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "remaining" DECIMAL(18,4) NOT NULL DEFAULT 0,
  CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveBalance_employeeId_leaveTypeId_year_key" UNIQUE ("employeeId","leaveTypeId","year"),
  CONSTRAINT "LeaveBalance_non_negative_check" CHECK ("opening" >= 0 AND "used" >= 0 AND "remaining" >= 0)
);

CREATE TABLE "LeaveRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "leaveTypeId" UUID NOT NULL,
  "fromDate" DATE NOT NULL,
  "toDate" DATE NOT NULL,
  "days" DECIMAL(18,4) NOT NULL,
  "reason" TEXT,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "approvalRequestId" UUID,
  "submittedAt" TIMESTAMPTZ(6),
  "cancelledAt" TIMESTAMPTZ(6),
  "decisionAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveRequest_approvalRequestId_key" UNIQUE ("approvalRequestId"),
  CONSTRAINT "LeaveRequest_date_check" CHECK ("toDate" >= "fromDate"),
  CONSTRAINT "LeaveRequest_days_check" CHECK ("days" > 0),
  CONSTRAINT "LeaveRequest_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','APPROVAL_PENDING','APPROVED','REJECTED','CANCELLED'))
);

CREATE TABLE "PayrollRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "payrollNo" VARCHAR(160) NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "grossTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deductionTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "netTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdById" UUID NOT NULL,
  "calculatedAt" TIMESTAMPTZ(6),
  "approvedAt" TIMESTAMPTZ(6),
  "approvedById" UUID,
  "postedAt" TIMESTAMPTZ(6),
  "journalEntryId" UUID,
  "approvalRequestId" UUID,
  "idempotencyKey" VARCHAR(200),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollRun_organizationId_payrollNo_key" UNIQUE ("organizationId","payrollNo"),
  CONSTRAINT "PayrollRun_organizationId_idempotencyKey_key" UNIQUE ("organizationId","idempotencyKey"),
  CONSTRAINT "PayrollRun_approvalRequestId_key" UNIQUE ("approvalRequestId"),
  CONSTRAINT "PayrollRun_period_check" CHECK ("periodEnd" >= "periodStart"),
  CONSTRAINT "PayrollRun_status_check" CHECK ("status" IN ('DRAFT','CALCULATED','REVIEWED','APPROVED','PAID','CANCELLED')),
  CONSTRAINT "PayrollRun_totals_check" CHECK ("grossTotal" >= 0 AND "deductionTotal" >= 0 AND "netTotal" >= 0)
);

CREATE TABLE "PayrollItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "payrollRunId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "basicSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "allowances" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "overtime" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "loanDeduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "absenceDeduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "gross" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "attendanceDays" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "leaveDays" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "componentsJson" JSONB,
  CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollItem_payrollRunId_employeeId_key" UNIQUE ("payrollRunId","employeeId"),
  CONSTRAINT "PayrollItem_non_negative_check" CHECK ("gross" >= 0 AND "deductions" >= 0 AND "net" >= 0)
);

CREATE INDEX "Attendance_organizationId_branchId_workDate_idx" ON "Attendance"("organizationId","branchId","workDate");
CREATE INDEX "Attendance_organizationId_employeeId_workDate_idx" ON "Attendance"("organizationId","employeeId","workDate");
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId","employeeId","status");
CREATE INDEX "LeaveRequest_organizationId_fromDate_toDate_idx" ON "LeaveRequest"("organizationId","fromDate","toDate");
CREATE INDEX "PayrollRun_organizationId_branchId_status_idx" ON "PayrollRun"("organizationId","branchId","status");
CREATE INDEX "PayrollRun_organizationId_periodStart_periodEnd_idx" ON "PayrollRun"("organizationId","periodStart","periodEnd");
CREATE INDEX "PayrollItem_organizationId_employeeId_idx" ON "PayrollItem"("organizationId","employeeId");

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
