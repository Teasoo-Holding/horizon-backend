-- AlterTable
ALTER TABLE "public"."companies" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
