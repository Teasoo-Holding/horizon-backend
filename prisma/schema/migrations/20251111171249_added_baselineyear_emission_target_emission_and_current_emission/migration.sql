-- AlterTable
ALTER TABLE "public"."Target" ADD COLUMN     "baselineYearEmission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "currentEmission" DOUBLE PRECISION,
ADD COLUMN     "targetEmission" DOUBLE PRECISION NOT NULL DEFAULT 0;
