-- DropIndex
DROP INDEX "public"."assessments_companyId_key";

-- AlterTable
ALTER TABLE "public"."Activities" ADD COLUMN     "companyId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Activities" ADD CONSTRAINT "Activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
