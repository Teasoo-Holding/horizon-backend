-- CreateTable "sectors" first
CREATE TABLE "sectors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sasb_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sectors_name_key" ON "sectors"("name");

-- Migrate existing sectors from industries to sectors (ignoring duplicates or nulls)
INSERT INTO "sectors" ("name")
SELECT DISTINCT "sector" FROM "industries" WHERE "sector" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Temporarily add columns to industries for mapping
ALTER TABLE "industries" ADD COLUMN "code" TEXT;
ALTER TABLE "industries" ADD COLUMN "description" TEXT;
ALTER TABLE "industries" ADD COLUMN "name" TEXT;
ALTER TABLE "industries" ADD COLUMN "sector_id" INTEGER;
ALTER TABLE "industries" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "industries" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Perform the data migration
UPDATE "industries" 
SET "name" = "industry", "sector_id" = "sectors"."id"
FROM "sectors" 
WHERE "industries"."sector" = "sectors"."name";

-- Ensure any new industries created concurrently or that failed lookup have a default name
-- Or cleanup orphans (we shouldn't have any if the SELECT worked)
-- Delete rows where sector_id is NULL just in case to safely add NOT NULL constraint
DELETE FROM "industries" WHERE "sector_id" IS NULL;

-- Make columns REQUIRED now
ALTER TABLE "industries" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "industries" ALTER COLUMN "sector_id" SET NOT NULL;

-- Drop constraints related to old schema
DROP INDEX IF EXISTS "industries_sector_industry_key";

-- Drop the columns
ALTER TABLE "industries" DROP COLUMN "industry", DROP COLUMN "sector";

-- Add final indexes and constraints
CREATE UNIQUE INDEX "industries_sector_id_name_key" ON "industries"("sector_id", "name");
ALTER TABLE "industries" ADD CONSTRAINT "industries_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
