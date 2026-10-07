-- PASS M4 remediation: align procurement quality-inspection table with the locked blueprint model name.
-- The earlier migration created GoodsReceiptInspection even though the locked entity catalog and capability locks require QualityInspection.
-- This migration preserves existing data by renaming the physical table and related identifiers.

ALTER TABLE IF EXISTS "GoodsReceiptInspection" RENAME TO "QualityInspection";

ALTER TABLE IF EXISTS "QualityInspection" RENAME CONSTRAINT "GoodsReceiptInspection_pkey" TO "QualityInspection_pkey";
ALTER TABLE IF EXISTS "QualityInspection" RENAME CONSTRAINT "GoodsReceiptInspection_result_check" TO "QualityInspection_result_check";
ALTER TABLE IF EXISTS "QualityInspection" RENAME CONSTRAINT "GoodsReceiptInspection_organization_fkey" TO "QualityInspection_organization_fkey";
ALTER TABLE IF EXISTS "QualityInspection" RENAME CONSTRAINT "GoodsReceiptInspection_grn_fkey" TO "QualityInspection_goods_receipt_fkey";
ALTER TABLE IF EXISTS "QualityInspection" RENAME CONSTRAINT "GoodsReceiptInspection_inspector_fkey" TO "QualityInspection_inspector_fkey";

ALTER INDEX IF EXISTS "GoodsReceiptInspection_org_grn_idx" RENAME TO "QualityInspection_org_grn_idx";
ALTER INDEX IF EXISTS "GoodsReceiptInspection_organizationId_inspectorId_idx" RENAME TO "QualityInspection_organizationId_inspectorId_idx";
