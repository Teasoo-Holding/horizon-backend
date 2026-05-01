-- AlterTable: sync ESG score columns from develop branch.
-- Idempotent: safe to apply on a fresh DB (creates columns) or on a DB that
-- already has them (no-op). Restored after the file was emptied during a
-- merge — the columns themselves were already applied to local databases.
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "esgScore" DOUBLE PRECISION;
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "esgGrade" TEXT;
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "esgPillars" JSONB;
