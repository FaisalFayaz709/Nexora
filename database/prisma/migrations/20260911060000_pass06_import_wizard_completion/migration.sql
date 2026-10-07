-- PASS 06: Data Import Wizard baseline subject coverage.
-- Keeps the existing ImportBatch table and broad string subjectType model, while allowing
-- baseline master imports for customer sites, product categories and units of measure.
ALTER TABLE "ImportBatch" DROP CONSTRAINT IF EXISTS "ImportBatch_subject_check";
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_subject_check" CHECK ("subjectType" IN ('EMPLOYEE','CUSTOMER','CUSTOMER_SITE','VENDOR','PRODUCT_CATEGORY','UNIT_OF_MEASURE','PRODUCT','WAREHOUSE','INVENTORY'));

CREATE INDEX IF NOT EXISTS "ImportRow_org_batch_row_idx" ON "ImportRow"("organizationId","batchId","rowNumber");
CREATE INDEX IF NOT EXISTS "ImportRowError_org_code_idx" ON "ImportRowError"("organizationId","code","severity");
