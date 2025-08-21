/*
  Warnings:

  - A unique constraint covering the columns `[sector,industry]` on the table `industries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "industries_sector_industry_key" ON "public"."industries"("sector", "industry");
