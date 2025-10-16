/*
  Warnings:

  - The values [draft,submitted,reviewed] on the enum `AssessmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lastSavedForm` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AssessmentStatus_new" AS ENUM ('in_progress', 'awaiting_review', 'submitted_approved', 'approved', 'unapproved_rejected');
ALTER TABLE "public"."assessments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."assessments" ALTER COLUMN "status" TYPE "public"."AssessmentStatus_new" USING ("status"::text::"public"."AssessmentStatus_new");
ALTER TYPE "public"."AssessmentStatus" RENAME TO "AssessmentStatus_old";
ALTER TYPE "public"."AssessmentStatus_new" RENAME TO "AssessmentStatus";
DROP TYPE "public"."AssessmentStatus_old";
ALTER TABLE "public"."assessments" ALTER COLUMN "status" SET DEFAULT 'in_progress';
COMMIT;

-- AlterTable
ALTER TABLE "public"."assessments" DROP COLUMN "lastSavedForm",
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'in_progress';

-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "requireAssessmentReview" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
