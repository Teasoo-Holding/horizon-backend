/*
  Warnings:

  - You are about to drop the column `completedAt` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `reportingPeriod` on the `assessments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,status]` on the table `assessments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assessmentData` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endMonth` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endYear` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startMonth` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startYear` to the `assessments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."AssessmentStatus" ADD VALUE 'reviewed';

-- DropForeignKey
ALTER TABLE "public"."assessments" DROP CONSTRAINT "assessments_createdById_fkey";

-- DropIndex
DROP INDEX "public"."assessments_createdById_idx";

-- AlterTable
ALTER TABLE "public"."assessments" DROP COLUMN "completedAt",
DROP COLUMN "createdById",
DROP COLUMN "reportingPeriod",
ADD COLUMN     "assessmentData" JSONB NOT NULL,
ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "endMonth" TEXT NOT NULL,
ADD COLUMN     "endYear" TEXT NOT NULL,
ADD COLUMN     "startMonth" TEXT NOT NULL,
ADD COLUMN     "startYear" TEXT NOT NULL,
ADD COLUMN     "updated_by" INTEGER;

-- CreateIndex
CREATE INDEX "assessments_companyId_idx" ON "public"."assessments"("companyId");

-- CreateIndex
CREATE INDEX "assessments_created_by_idx" ON "public"."assessments"("created_by");

-- CreateIndex
CREATE INDEX "assessments_updated_by_idx" ON "public"."assessments"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_companyId_status_key" ON "public"."assessments"("companyId", "status");

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
