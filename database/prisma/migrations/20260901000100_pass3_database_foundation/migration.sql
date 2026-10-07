CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserStatus" AS ENUM (
  'ACTIVE',
  'LOCKED',
  'SUSPENDED',
  'PASSWORD_EXPIRED',
  'DISABLED'
);

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key" UNIQUE ("email")
);

CREATE TABLE "Session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "device" VARCHAR(255),
  "ip" VARCHAR(64),
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaCredential" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "secretEncrypted" TEXT NOT NULL,
  "enabledAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(160) NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Permission_key_key" UNIQUE ("key")
);

CREATE TABLE "Organization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "timezone" VARCHAR(100) NOT NULL,
  "locale" VARCHAR(35) NOT NULL,
  "status" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Organization_code_key" UNIQUE ("code")
);

CREATE TABLE "Address" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "lines" JSONB NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "region" VARCHAR(120),
  "country" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Branch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "addressId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Branch_organizationId_code_key" UNIQUE ("organizationId", "code")
);

CREATE TABLE "Department" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "managerEmployeeId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "key" VARCHAR(160) NOT NULL,
  "valueJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationSetting_organizationId_key_key" UNIQUE ("organizationId", "key")
);

CREATE TABLE "Role" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "systemRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Role_organizationId_name_key" UNIQUE ("organizationId", "name")
);

CREATE TABLE "RolePermission" (
  "roleId" UUID NOT NULL,
  "permissionId" UUID NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "OrganizationMembership" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "status" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationMembership_userId_organizationId_key" UNIQUE ("userId", "organizationId")
);

CREATE TABLE "UserRole" (
  "membershipId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "actorUserId" UUID,
  "action" VARCHAR(160) NOT NULL,
  "subjectType" VARCHAR(120) NOT NULL,
  "subjectId" UUID NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "ip" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "type" VARCHAR(160) NOT NULL,
  "aggregateType" VARCHAR(120) NOT NULL,
  "aggregateId" UUID NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMPTZ(6),
  CONSTRAINT "BusinessEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyKey" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "key" VARCHAR(255) NOT NULL,
  "route" VARCHAR(255) NOT NULL,
  "requestHash" VARCHAR(128) NOT NULL,
  "responseJson" JSONB,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdempotencyKey_organizationId_route_key_key" UNIQUE ("organizationId", "route", "key")
);

CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_revokedAt_idx" ON "Session"("expiresAt", "revokedAt");
CREATE INDEX "MfaCredential_userId_type_idx" ON "MfaCredential"("userId", "type");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Address_organizationId_type_idx" ON "Address"("organizationId", "type");
CREATE INDEX "Address_organizationId_country_city_idx" ON "Address"("organizationId", "country", "city");
CREATE INDEX "Branch_organizationId_name_idx" ON "Branch"("organizationId", "name");
CREATE INDEX "Branch_organizationId_addressId_idx" ON "Branch"("organizationId", "addressId");
CREATE INDEX "Department_organizationId_branchId_idx" ON "Department"("organizationId", "branchId");
CREATE INDEX "Department_organizationId_managerEmployeeId_idx" ON "Department"("organizationId", "managerEmployeeId");
CREATE INDEX "Team_organizationId_departmentId_idx" ON "Team"("organizationId", "departmentId");
CREATE INDEX "Team_organizationId_name_idx" ON "Team"("organizationId", "name");
CREATE INDEX "Role_organizationId_systemRole_idx" ON "Role"("organizationId", "systemRole");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX "OrganizationMembership_organizationId_status_idx" ON "OrganizationMembership"("organizationId", "status");
CREATE INDEX "OrganizationMembership_organizationId_branchId_status_idx" ON "OrganizationMembership"("organizationId", "branchId", "status");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_organizationId_subjectType_subjectId_createdAt_idx" ON "AuditLog"("organizationId", "subjectType", "subjectId", "createdAt");
CREATE INDEX "AuditLog_organizationId_actorUserId_createdAt_idx" ON "AuditLog"("organizationId", "actorUserId", "createdAt");
CREATE INDEX "BusinessEvent_organizationId_type_occurredAt_idx" ON "BusinessEvent"("organizationId", "type", "occurredAt");
CREATE INDEX "BusinessEvent_organizationId_aggregateType_aggregateId_occurredAt_idx" ON "BusinessEvent"("organizationId", "aggregateType", "aggregateId", "occurredAt");
CREATE INDEX "BusinessEvent_publishedAt_occurredAt_idx" ON "BusinessEvent"("publishedAt", "occurredAt");
CREATE INDEX "IdempotencyKey_organizationId_expiresAt_idx" ON "IdempotencyKey"("organizationId", "expiresAt");

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MfaCredential"
  ADD CONSTRAINT "MfaCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Address"
  ADD CONSTRAINT "Address_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Department"
  ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Department"
  ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- managerEmployeeId has no FK in Pass 3 because Employee is a later physical model.

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationSetting"
  ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Role"
  ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRole"
  ADD CONSTRAINT "UserRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole"
  ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BusinessEvent"
  ADD CONSTRAINT "BusinessEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IdempotencyKey"
  ADD CONSTRAINT "IdempotencyKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION nexora_reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable; append a new audit record instead';
END;
$$;

CREATE TRIGGER "AuditLog_immutable"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION nexora_reject_audit_log_mutation();
