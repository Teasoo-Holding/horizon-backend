-- AlterTable
ALTER TABLE "public"."task_assignments" ADD COLUMN     "assessmentId" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "public"."task_assignments" ADD CONSTRAINT "task_assignments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
