/*
  Warnings:

  - You are about to drop the column `industry` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `sicsCode` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `staff` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `subSector` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."companies" DROP COLUMN "industry",
DROP COLUMN "sector",
DROP COLUMN "sicsCode",
DROP COLUMN "staff",
DROP COLUMN "subSector",
ADD COLUMN     "industryId" INTEGER;

-- CreateTable
CREATE TABLE "public"."industries" (
    "id" SERIAL NOT NULL,
    "sector" TEXT NOT NULL,
    "industry" TEXT NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
