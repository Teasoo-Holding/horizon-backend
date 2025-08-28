/*
  Warnings:

  - You are about to drop the column `companyId` on the `LocationBasedS2` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `MarketBasedS2` table. All the data in the column will be lost.
  - You are about to drop the column `staff` on the `Subsidiary` table. All the data in the column will be lost.
  - Added the required column `subsidiaryId` to the `LocationBasedS2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subsidiaryId` to the `MarketBasedS2` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."LocationBasedS2" DROP CONSTRAINT "LocationBasedS2_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MarketBasedS2" DROP CONSTRAINT "MarketBasedS2_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."LocationBasedS2" DROP COLUMN "companyId",
ADD COLUMN     "subsidiaryId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."MarketBasedS2" DROP COLUMN "companyId",
ADD COLUMN     "subsidiaryId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Subsidiary" DROP COLUMN "staff",
ALTER COLUMN "status" SET DEFAULT 'active';

-- AddForeignKey
ALTER TABLE "public"."LocationBasedS2" ADD CONSTRAINT "LocationBasedS2_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketBasedS2" ADD CONSTRAINT "MarketBasedS2_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
