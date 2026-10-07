-- Missing Pass M16: reports, dashboards, global search and calendar completion
-- Adds branch-aware global-search scoping and report/dashboard read-model indexes without changing the locked stack.

ALTER TABLE "SearchIndexEntry" ADD COLUMN IF NOT EXISTS "branchId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SearchIndexEntry_branchId_fkey'
  ) THEN
    ALTER TABLE "SearchIndexEntry"
      ADD CONSTRAINT "SearchIndexEntry_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SearchIndexEntry_organizationId_branchId_entityType_idx"
  ON "SearchIndexEntry"("organizationId", "branchId", "entityType");

CREATE INDEX IF NOT EXISTS "SavedReport_organizationId_ownerUserId_updatedAt_idx"
  ON "SavedReport"("organizationId", "ownerUserId", "updatedAt");

CREATE INDEX IF NOT EXISTS "ReportExecution_organizationId_status_createdAt_idx"
  ON "ReportExecution"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "DashboardWidget_organizationId_userDashboardId_updatedAt_idx"
  ON "DashboardWidget"("organizationId", "userDashboardId", "updatedAt");

CREATE INDEX IF NOT EXISTS "CalendarFeedItem_organizationId_branchId_startsAt_idx"
  ON "CalendarFeedItem"("organizationId", "branchId", "startsAt");
