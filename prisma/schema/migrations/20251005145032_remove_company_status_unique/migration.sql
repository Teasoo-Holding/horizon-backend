/*
  Warnings:

  -- - A unique constraint covering the columns `[companyId]` on the table `assessments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX IF EXISTS "assessments_companyId_status_key";

-- CreateIndex
CREATE UNIQUE INDEX "assessments_companyId_key" ON "public"."assessments"("companyId");
