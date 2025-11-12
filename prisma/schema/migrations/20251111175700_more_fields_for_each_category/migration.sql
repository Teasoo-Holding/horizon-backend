/*
  Warnings:

  - You are about to drop the column `baselineYearEmission` on the `Target` table. All the data in the column will be lost.
  - You are about to drop the column `currentEmission` on the `Target` table. All the data in the column will be lost.
  - You are about to drop the column `targetEmission` on the `Target` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."GeneralTarget" ADD COLUMN     "baselineYearEmission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "currentEmission" DOUBLE PRECISION,
ADD COLUMN     "targetEmission" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."ScopeTarget" ADD COLUMN     "baselineYearEmission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "currentEmission" DOUBLE PRECISION,
ADD COLUMN     "targetEmission" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Target" DROP COLUMN "baselineYearEmission",
DROP COLUMN "currentEmission",
DROP COLUMN "targetEmission";
