-- AlterTable
ALTER TABLE "report" ADD COLUMN     "esgGrade" TEXT,
ADD COLUMN     "esgPillars" JSONB,
ADD COLUMN     "esgScore" DOUBLE PRECISION;
