-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "companyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
