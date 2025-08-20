-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "parentCompanyId" INTEGER,
ADD COLUMN     "teamLeadId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
