-- Pass R6: Real MinIO document storage metadata.
-- The storage object is private by default and tenant scoped by organization-prefixed objectKey.
ALTER TABLE "DocumentVersion"
  ADD COLUMN IF NOT EXISTS "bucketName" VARCHAR(120) NOT NULL DEFAULT 'nexora-private';

CREATE INDEX IF NOT EXISTS "DocumentVersion_organizationId_bucketName_idx"
  ON "DocumentVersion"("organizationId", "bucketName");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DocumentVersion_bucket_not_blank_check'
  ) THEN
    ALTER TABLE "DocumentVersion"
      ADD CONSTRAINT "DocumentVersion_bucket_not_blank_check"
      CHECK (length(trim("bucketName")) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DocumentVersion_object_key_tenant_prefix_check'
  ) THEN
    ALTER TABLE "DocumentVersion"
      ADD CONSTRAINT "DocumentVersion_object_key_tenant_prefix_check"
      CHECK ("objectKey" LIKE 'organizations/%/documents/%');
  END IF;
END $$;
