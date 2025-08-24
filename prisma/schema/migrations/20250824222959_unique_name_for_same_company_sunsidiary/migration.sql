/*
  Warnings:

  - A unique constraint covering the columns `[name,parentCompanyId]` on the table `Subsidiary` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Subsidiary_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiary_name_parentCompanyId_key" ON "public"."Subsidiary"("name", "parentCompanyId");
