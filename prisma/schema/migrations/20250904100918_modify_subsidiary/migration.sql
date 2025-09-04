/*
  Warnings:

  - You are about to drop the column `industry` on the `Subsidiary` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Subsidiary` table. All the data in the column will be lost.
  - You are about to drop the column `subSector` on the `Subsidiary` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CompanyType" AS ENUM ('esg', 'investor', 'regulator');

-- AlterTable
ALTER TABLE "public"."Subsidiary" DROP COLUMN "industry",
DROP COLUMN "sector",
DROP COLUMN "subSector",
ADD COLUMN     "industryId" INTEGER;

-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "company_type" "public"."CompanyType";

-- AddForeignKey
ALTER TABLE "public"."Subsidiary" ADD CONSTRAINT "Subsidiary_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
